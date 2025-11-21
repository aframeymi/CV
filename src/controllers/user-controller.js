// src/controllers/user-controller.js
import prisma from '../../prismaClient.js';
import bcrypt from 'bcrypt';

export async function createUserProfile(req, res) {
  try {
    const { email, password, name, surname, phone } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(422).json({
        email: 'Email is required',
        password: 'Password is required',
      });
    }

    // Ensure default role exists (required by schema)
    let citizen = await prisma.role.findUnique({ where: { title: 'Citizen' } });
    if (!citizen) {
      citizen = await prisma.role.create({
        data: { title: 'Citizen', description: 'Regular user' },
      });
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Already have a DB profile—redirect to home (or login page)
      return res.redirect('/');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user aligned with Prisma schema fields
    await prisma.user.create({
      data: {
        firstName: name || '',       // map 'name' -> 'firstName'
        lastName: surname || '',     // map 'surname' -> 'lastName'
        phone: phone || '',
        email,
        passwordHash,
        firebaseUid: req.firebaseUser?.uid || null,
        roleId: citizen.id,          // REQUIRED foreign key
      },
    });

    // Redirect to homepage on success
    return res.redirect('/');

  } catch (err) {
    console.error('Error creating user profile:', err);
    return res.status(500).json({
      error:
        'User created in Firebase, but saving to database failed. Please try again later.',
    });
  }
}
