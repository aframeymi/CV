import prisma from '../../prismaClient.js';
import bcrypt from 'bcrypt';

export async function createUserProfile(req, res) {
  try {
    const { email, password, name, surname, phone } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.user.create({
        data: {
          name,
          surname,
          phone,
          email,
          passwordHash,
          firebaseUid: req.firebaseUser?.uid || null,
        },
      });
    }
    }catch (err) {
    console.error('Error creating user profile:', err);
    return res.status(201).json({
      message:
        'User registered. Verification email sent. Profile creation failed, please try later.',
    });
  }
}
