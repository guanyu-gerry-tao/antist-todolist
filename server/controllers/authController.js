const { req, res } = require('express');
const User = require('../database/models/userAuths'); // Import the User model
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const loginUser = async (req, res) => {
  const { email, phoneNumber, password } = req.body;

  const identifier = email || phoneNumber;
  let user = undefined;
  try {
    if (email) {
      user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
    } else if (phoneNumber) {
      user = await User.findOne({ phoneNumber });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
    } else {
      return res.status(400).json({ message: 'Email or phone number is required' });
    }

    // Verify password
    const isPasswordMatching = await bcrypt.compare(password, user.pwHash);
    if (!isPasswordMatching) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET,
      { expiresIn: '14d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-site in production
      maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
    });

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
      }
    })
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = loginUser;