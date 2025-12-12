const Post = require('../Models/Post');
const Notification = require('../Models/Notification');
const User = require('../Models/User');

// Get All Pending Posts (Admin Only)
exports.getPendingPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const posts = await Post.find(
      { status: 'pending', isActive: true },
      { page, limit, sortBy: 'createdAt', order: 'desc' }
    );

    const total = await Post.count({ status: 'pending', isActive: true });

    res.status(200).json({
      success: true,
      posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPosts: total
      }
    });

  } catch (error) {
    console.error('Get pending posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending posts',
      error: error.message
    });
  }
};

// Approve Post (Admin Only)
exports.approvePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { moderationNote } = req.body;

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending posts can be approved'
      });
    }

    const updatedPost = await Post.update(id, {
      status: 'approved',
      moderatedBy: req.user.id,
      moderatedAt: new Date().toISOString(),
      moderationNote: moderationNote || null
    });

    // Create notification for post author
    await Notification.create({
      recipient: post.authorId,
      type: 'post_approved',
      title: 'Post Approved',
      message: `Your post "${post.title}" has been approved and is now visible in the feed.`,
      relatedPost: post.id,
      actionBy: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Post approved successfully',
      post: updatedPost
    });

  } catch (error) {
    console.error('Approve post error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving post',
      error: error.message
    });
  }
};

// Reject Post (Admin Only)
exports.rejectPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { moderationNote } = req.body;

    if (!moderationNote) {
      return res.status(400).json({
        success: false,
        message: 'Moderation note is required when rejecting a post'
      });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending posts can be rejected'
      });
    }

    const updatedPost = await Post.update(id, {
      status: 'rejected',
      moderatedBy: req.user.id,
      moderatedAt: new Date().toISOString(),
      moderationNote: moderationNote,
      isActive: false
    });

    // Create notification for post author
    await Notification.create({
      recipient: post.authorId,
      type: 'post_rejected',
      title: 'Post Rejected',
      message: `Your post "${post.title}" has been rejected. Reason: ${moderationNote}`,
      relatedPost: post.id,
      actionBy: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Post rejected and removed from system',
      post: updatedPost
    });

  } catch (error) {
    console.error('Reject post error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting post',
      error: error.message
    });
  }
};

// Get All Users (Admin Only)
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { role } = req.query;

    const filter = { isActive: true };
    if (role) {
      filter.role = role;
    }

    const users = await User.find(filter, {
      page,
      limit,
      sortBy: 'createdAt',
      order: 'desc'
    });

    const total = await User.count(filter);

    res.status(200).json({
      success: true,
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// Get Platform Statistics (Admin Only)
exports.getStatistics = async (req, res) => {
  try {
    const totalUsers = await User.count({ isActive: true });
    const totalPosts = await Post.count({ isActive: true });
    const pendingPosts = await Post.count({ status: 'pending', isActive: true });
    const approvedPosts = await Post.count({ status: 'approved', isActive: true });
    const rejectedPosts = await Post.count({ status: 'rejected' });

    // Users by role
    const adminCount = await User.count({ role: 'admin', isActive: true });
    const registeredCount = await User.count({ role: 'registered', isActive: true });

    // Recent activity - get recent posts
    const recentPosts = await Post.find(
      { isActive: true },
      { limit: 5, sortBy: 'createdAt', order: 'desc' }
    );

    res.status(200).json({
      success: true,
      statistics: {
        users: {
          total: totalUsers,
          admin: adminCount,
          registered: registeredCount
        },
        posts: {
          total: totalPosts,
          pending: pendingPosts,
          approved: approvedPosts,
          rejected: rejectedPosts
        },
        recentPosts
      }
    });

  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};
