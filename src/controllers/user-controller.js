import prisma from '../../prismaClient.js';
import bcrypt from 'bcrypt';

export async function createUserProfile(req, res) {
  try {
    const { email, password, name, surname, phone } = req.body;

    if (!email || !password) {
      return res.status(422).json({
        email: 'Email is required',
        password: 'Password is required',
      });
    }

    let citizen = await prisma.role.findUnique({ where: { title: 'Citizen' } });
    if (!citizen) {
      citizen = await prisma.role.create({
        data: { title: 'Citizen', description: 'Regular user' },
      });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.redirect('/');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        firstName: name || '',       
        lastName: surname || '',    
        phone: phone || '',
        email,
        passwordHash,
        firebaseUid: req.firebaseUser?.uid || null,
        roleId: citizen.id,         
      },
    });

    return res.redirect('/');

  } catch (err) {
    console.error('Error creating user profile:', err);
    return res.status(500).json({
      error:
        'User created in Firebase, but saving to database failed. Please try again later.',
    });
  }
}
