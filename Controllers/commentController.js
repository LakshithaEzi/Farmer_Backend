const Comment = require("../Models/Comment");
const Post = require("../Models/Post");
const Notification = require("../Models/Notification");
const db = require("../Config/sqlite");

// Create Comment
exports.createComment = async (req, res) => {
  try {
    const { content, postId, parentCommentId } = req.body;

    if (!content || !postId) {
      return res.status(400).json({
        success: false,
        message: "Content and post ID are required",
      });
    }

    // Check if post exists and is approved
    const post = await Post.findById(postId);

    if (!post || post.status !== "approved") {
      return res.status(404).json({
        success: false,
        message: "Post not found or not approved",
      });
    }

    const comment = await Comment.create({
      content,
      post: postId,
      author: req.user.id,
      parentComment: parentCommentId || null,
    });

    // Update post comments count
    const newCommentsCount = (post.commentsCount || 0) + 1;
    await Post.update(post.id, { commentsCount: newCommentsCount });

    // Create notification for post author (not if commenting on own post)
    if (post.authorId && post.authorId.toString() !== req.user.id) {
      await Notification.create({
        recipient: post.authorId,
        type: "comment",
        title: "New Comment",
        message: `${req.user.username} commented on your post`,
        relatedPost: postId,
        relatedComment: comment.id,
        actionBy: req.user.id,
      });
    }

    // If it's a reply, notify the parent comment author
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (
        parentComment &&
        parentComment.authorId &&
        parentComment.authorId.toString() !== req.user.id
      ) {
        await Notification.create({
          recipient: parentComment.authorId,
          type: "reply",
          title: "New Reply",
          message: `${req.user.username} replied to your comment`,
          relatedPost: postId,
          relatedComment: comment.id,
          actionBy: req.user.id,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      comment,
    });
  } catch (error) {
    console.error("Create comment error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating comment",
      error: error.message,
    });
  }
};

// Get Comments for a Post
exports.getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const topComments = await Comment.findTopLevelByPost(postId, {
      page,
      limit,
    });

    const commentsWithReplies = await Promise.all(
      topComments.map(async (comment) => {
        const replies = await Comment.findReplies(comment.id);
        return { ...comment, replies };
      })
    );

    const total = db.get(
      "SELECT COUNT(*) as cnt FROM comments WHERE post = ? AND isActive = 1 AND parentComment IS NULL",
      [postId]
    ).cnt;

    res.status(200).json({
      success: true,
      comments: commentsWithReplies,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalComments: total,
      },
    });
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching comments",
      error: error.message,
    });
  }
};

// Update Comment (Author Only)
exports.updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Content is required",
      });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check ownership
    if (comment.authorId && comment.authorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this comment",
      });
    }

    const updated = await Comment.update(id, { content });

    res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      comment,
    });
  } catch (error) {
    console.error("Update comment error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating comment",
      error: error.message,
    });
  }
};

// Delete Comment (Author Only)
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check ownership
    if (comment.authorId && comment.authorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this comment",
      });
    }

    // Soft delete
    await Comment.softDelete(id);

    // Decrease post comments count
    const postRecord = await Post.findById(comment.postId);
    const newCount = Math.max((postRecord.commentsCount || 1) - 1, 0);
    await Post.update(postRecord.id, { commentsCount: newCount });

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting comment",
      error: error.message,
    });
  }
};

// Like/Unlike Comment
exports.toggleLike = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const result = Comment.toggleLike(id, req.user.id);
    if (!result)
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    res
      .status(200)
      .json({
        success: true,
        message:
          result.action === "unliked" ? "Comment unliked" : "Comment liked",
        likesCount: result.likesCount,
      });
  } catch (error) {
    console.error("Toggle comment like error:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling like",
      error: error.message,
    });
  }
};
