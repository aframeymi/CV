// Database client (Prisma) and bcrypt for hashing passwords
import prisma from '../../prismaClient.js';
import bcrypt from 'bcrypt';

// Save the new user in our database (runs after the Firebase account is created)
export async function createUserProfile(req, res) {
  try {

    // Read the registration form fields
    const { email, password, name, surname, phone } = req.body;

    if (!email || !password) {
      return res.status(422).json({
        email: 'Email is required',
        password: 'Password is required',
      });
    }

    // Get the 'Citizen' role, creating it if it doesn't exist yet
    let citizen = await prisma.role.findUnique({ where: { title: 'Citizen' } });
    if (!citizen) {
      citizen = await prisma.role.create({
        data: { title: 'Citizen', description: 'Regular user' },
      });
    }

    // If the user already exists, skip creating a duplicate
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {

      // Already registered: go to the home page
      return res.redirect('/');
    }

    // Hash the password before storing it (never store plain text)
    const passwordHash = await bcrypt.hash(password, 10);

    // Save the user with the Citizen role and Firebase uid
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

    // Registration done: go to the home page
    return res.redirect('/');

  } catch (err) {
    
    // Firebase account exists but the database save failed
    console.error('Error creating user profile:', err);
    return res.status(500).json({
      error:
        'User created in Firebase, but saving to database failed. Please try again later.',
    });
  }
}
