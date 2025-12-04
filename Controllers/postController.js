const Post = require("../Models/Post");
const db = require("../Config/mysql");

// Like/Unlike Post
exports.toggleLike = async (req, res) => {
  try {
    // ✅ FIXED: Added await
    const result = await Post.toggleLike(req.params.id, req.user.id);
    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // Create notification for post author (not if liking own post)
    const post = await Post.findById(req.params.id);
    if (
      post &&
      post.authorId &&
      post.authorId.toString() !== req.user.id &&
      result.action === "liked"
    ) {
      await db.run(
        "INSERT INTO notifications (recipient, type, title, message, relatedPost, actionBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          post.authorId,
          "like",
          "New Like",
          `${req.user.username} liked your post`,
          post.id,
          req.user.id,
          new Date().toISOString()
        ]
      );
    }

    res.status(200).json({
      success: true,
      message: result.action === "unliked" ? "Post unliked" : "Post liked",
      likesCount: result.likesCount,
    });
  } catch (error) {
    console.error("Toggle like error:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling like",
      error: error.message,
    });
  }
};

// Create Post (Registered Users Only)
exports.createPost = async (req, res) => {
  try {
    const { title, content, category } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required",
      });
    }

    let images = [];
    if (req.files && req.files.length) {
      images = req.files
        .map((f) => (f.path ? f.path.replace(/\\\\/g, "/") : f.filename))
        .filter(Boolean);
    } else if (req.body.images) {
      try {
        images =
          typeof req.body.images === "string"
            ? JSON.parse(req.body.images)
            : req.body.images;
      } catch (e) {
        images = Array.isArray(req.body.images) ? req.body.images : [];
      }
    }

    const post = await Post.create({
      title,
      content,
      category,
      images,
      author: req.user.id,
      status: "pending", // ✅ Correctly set to pending
    });

    res.status(201).json({
      success: true,
      message: "Post created successfully and sent for moderation",
      post,
    });
  } catch (error) {
    console.error("Create post error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating post",
      error: error.message,
    });
  }
};

// Get All Approved Posts (Feed) - Public Access
exports.getFeed = async (req, res) => {
  try {
    const { category, page = 1, limit = 10, sortBy = "createdAt" } = req.query;

    // ✅ Only fetch approved and active posts
    const query = { status: "approved", isActive: true };

    if (category && category !== "all") {
      query.category = category;
    }

    const skip = (page - 1) * limit;

    const posts = await Post.find(query, {
      page,
      limit,
      sortBy,
      order: "desc",
    });
    const total = await Post.count(query);

    res.status(200).json({
      success: true,
      posts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        hasMore: skip + posts.length < total,
      },
    });
  } catch (error) {
    console.error("Get feed error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching feed",
      error: error.message,
    });
  }
};

// Get Single Post - Public Access
exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Enforce visibility: only the author or an admin can view non-approved posts
    const postAuthorId = String(post.author?._id ?? post.authorId ?? "");
    const requesterId = req.user ? String(req.user.id) : null;
    const requesterRole = req.user ? String(req.user.role || "user") : "guest";

    const isAuthor =
      requesterId && postAuthorId && requesterId === postAuthorId;
    const isAdmin = requesterRole === "admin" || requesterRole === "moderator";

    // If the post is not approved, only allow access to the author or admins/moderators
    if (post.status !== "approved") {
      if (!isAuthor && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "This post is not available",
        });
      }
    }

    await Post.incrementViews(post.id);

    res.status(200).json({
      success: true,
      post,
    });
  } catch (error) {
    console.error("Get post error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching post",
      error: error.message,
    });
  }
};

// In your postController.js - getMyPosts
exports.getMyPosts = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    console.log("📥 Request from user:", req.user.id);
    console.log("📥 Status filter:", status);

    // By default show pending posts for the current user (so they can see posts awaiting moderation)
    // If the client explicitly requests `status=all` we return all statuses.
    const query = { author: req.user.id, isActive: true };
    if (typeof status !== "undefined") {
      if (status !== "all") query.status = status;
    } else {
      query.status = "pending";
    }

    console.log("🔎 Query:", query);

    const posts = await Post.find(query, {
      page,
      limit,
      sortBy: "createdAt",
      order: "desc",
    });

    console.log("📤 Sending posts:", posts.length);

    const total = await Post.count(query);

    res.status(200).json({
      success: true,
      posts, // ⚠️ Make sure this matches what Redux expects
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
      },
    });
  } catch (error) {
    console.error("Get my posts error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching your posts",
      error: error.message,
    });
  }
};
// ✅ NEW: Get posts by a specific user (for viewing other profiles)
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Only show approved posts when viewing another user's profile
    const query = {
      author: userId,
      status: "approved",
      isActive: true,
    };

    const skip = (page - 1) * limit;

    const posts = await Post.find(query, {
      page,
      limit,
      sortBy: "createdAt",
      order: "desc",
    });
    const total = await Post.count(query);

    res.status(200).json({
      success: true,
      posts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
      },
    });
  } catch (error) {
    console.error("Get user posts error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user posts",
      error: error.message,
    });
  }
};

// Update Post (Author Only, Only if Pending)
exports.updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // ✅ FIXED: Simplified authorization check
    const postAuthorId =
      post.author?.id?.toString() || post.authorId?.toString();
    if (postAuthorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this post",
      });
    }

    if (post.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Can only update pending posts",
      });
    }

    const { title, content, category, images } = req.body;

    const updated = await Post.update(post.id, {
      title,
      content,
      category,
      images,
    });

    res.status(200).json({
      success: true,
      message: "Post updated successfully",
      post: updated,
    });
  } catch (error) {
    console.error("Update post error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating post",
      error: error.message,
    });
  }
};

// Delete Post (Author Only)
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // ✅ FIXED: Simplified authorization check
    const postAuthorId =
      post.author?.id?.toString() || post.authorId?.toString();
    if (postAuthorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this post",
      });
    }

    // Soft delete by setting isActive to false
    await Post.update(post.id, { isActive: false });

    res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting post",
      error: error.message,
    });
  }
};
