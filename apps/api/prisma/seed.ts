// Database Seed Script
// Creates demo users for testing

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper to generate slug from name
const generateSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

// Helper to determine skill category
const getSkillCategory = (skillName: string): string => {
  const skillCategories: Record<string, string> = {
    'React': 'FRAMEWORK', 'Node.js': 'FRAMEWORK', 'Vue.js': 'FRAMEWORK', 
    'React Native': 'FRAMEWORK', 'TypeScript': 'LANGUAGE', 'JavaScript': 'LANGUAGE',
    'Python': 'LANGUAGE', 'Go': 'LANGUAGE', 'Swift': 'LANGUAGE', 'Kotlin': 'LANGUAGE',
    'PostgreSQL': 'DATABASE', 'Firebase': 'DATABASE', 'CSS': 'DESIGN', 'Figma': 'DESIGN',
    'Kubernetes': 'DEVOPS', 'Docker': 'DEVOPS', 'Terraform': 'DEVOPS', 'CI/CD': 'DEVOPS',
    'Linux': 'DEVOPS', 'AWS': 'CLOUD', 'Administration': 'OTHER',
  };
  return skillCategories[skillName] || 'OTHER';
};

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Hash password function
  const hashPassword = async (password: string) => {
    return bcrypt.hash(password, 12);
  };

  // Create Super Admin
  const superAdminPassword = await hashPassword('SuperAdmin@123');
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@devconnect.com' },
    update: {},
    create: {
      email: 'superadmin@devconnect.com',
      username: 'superadmin',
      passwordHash: superAdminPassword,
      displayName: 'Super Admin',
      role: 'SUPER_ADMIN',
      bio: 'Platform Super Administrator',
      emailVerified: true,
      skills: {
        create: [
          { skill: { connectOrCreate: { where: { name: 'Administration' }, create: { name: 'Administration', slug: 'administration', category: 'OTHER' } } } },
        ],
      },
    },
  });
  console.log('✅ Super Admin created:', superAdmin.email);

  // Create Admin
  const adminPassword = await hashPassword('Admin@123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@devconnect.com' },
    update: {},
    create: {
      email: 'admin@devconnect.com',
      username: 'admin',
      passwordHash: adminPassword,
      displayName: 'Admin User',
      role: 'ADMIN',
      bio: 'Platform Administrator',
      emailVerified: true,
    },
  });
  console.log('✅ Admin created:', admin.email);

  // Create Moderator
  const modPassword = await hashPassword('Moderator@123');
  const moderator = await prisma.user.upsert({
    where: { email: 'moderator@devconnect.com' },
    update: {},
    create: {
      email: 'moderator@devconnect.com',
      username: 'moderator',
      passwordHash: modPassword,
      displayName: 'Moderator User',
      role: 'MODERATOR',
      bio: 'Content Moderator',
      emailVerified: true,
    },
  });
  console.log('✅ Moderator created:', moderator.email);

  // Create Demo Users
  const demoPassword = await hashPassword('Demo@123');
  
  const demoUsers = [
    {
      email: 'john@example.com',
      username: 'johndoe',
      displayName: 'John Doe',
      bio: 'Full-stack developer passionate about React and Node.js',
      headline: 'Senior Software Engineer at Tech Corp',
      location: 'San Francisco, CA',
      githubUrl: 'https://github.com/johndoe',
      skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
    },
    {
      email: 'jane@example.com',
      username: 'janesmith',
      displayName: 'Jane Smith',
      bio: 'Frontend developer and UI/UX enthusiast',
      headline: 'UI Developer at Design Studio',
      location: 'New York, NY',
      githubUrl: 'https://github.com/janesmith',
      skills: ['Vue.js', 'CSS', 'Figma', 'JavaScript'],
    },
    {
      email: 'mike@example.com',
      username: 'mikedev',
      displayName: 'Mike Developer',
      bio: 'Backend specialist with a love for distributed systems',
      headline: 'Backend Engineer at Cloud Systems Inc',
      location: 'Seattle, WA',
      githubUrl: 'https://github.com/mikedev',
      skills: ['Python', 'Go', 'Kubernetes', 'AWS'],
    },
    {
      email: 'sarah@example.com',
      username: 'sarahcoder',
      displayName: 'Sarah Coder',
      bio: 'Mobile app developer specializing in React Native',
      headline: 'Mobile Developer at App Factory',
      location: 'Austin, TX',
      twitterUrl: 'https://twitter.com/sarahcoder',
      skills: ['React Native', 'Swift', 'Kotlin', 'Firebase'],
    },
    {
      email: 'alex@example.com',
      username: 'alextech',
      displayName: 'Alex Tech',
      bio: 'DevOps engineer automating everything',
      headline: 'DevOps Engineer at Infrastructure Co',
      location: 'Denver, CO',
      linkedinUrl: 'https://linkedin.com/in/alextech',
      skills: ['Docker', 'Terraform', 'CI/CD', 'Linux'],
    },
  ];

  for (const userData of demoUsers) {
    const { skills, ...userInfo } = userData;
    const user = await prisma.user.upsert({
      where: { email: userInfo.email },
      update: {},
      create: {
        ...userInfo,
        passwordHash: demoPassword,
        role: 'USER',
        emailVerified: true,
        isAvailableForHire: Math.random() > 0.5,
        skills: {
          create: skills.map((skillName) => ({
            skill: {
              connectOrCreate: {
                where: { name: skillName },
                create: { 
                  name: skillName, 
                  slug: generateSlug(skillName), 
                  category: getSkillCategory(skillName) as any 
                },
              },
            },
          })),
        },
      },
    });
    console.log('✅ Demo user created:', user.email);
  }

  // Create sample posts
  const john = await prisma.user.findUnique({ where: { email: 'john@example.com' } });
  if (john) {
    await prisma.post.create({
      data: {
        authorId: john.id,
        content: '🚀 Just launched my new project using Next.js 14 and it\'s amazing! The app router makes everything so much cleaner. Who else is loving the new React Server Components?',
        visibility: 'PUBLIC',
      },
    });
    console.log('✅ Sample post created');
  }

  // Create sample project
  const jane = await prisma.user.findUnique({ where: { email: 'jane@example.com' } });
  if (jane) {
    await prisma.project.create({
      data: {
        ownerId: jane.id,
        name: 'DevConnect UI Kit',
        slug: 'devconnect-ui-kit',
        description: 'A beautiful and accessible UI component library for React applications',
        longDescription: 'DevConnect UI Kit provides a comprehensive set of pre-built, customizable components that follow modern design principles and accessibility standards.',
        status: 'ACTIVE',
        visibility: 'PUBLIC',
        isOpenSource: true,
        isRecruiting: true,
        githubUrl: 'https://github.com/example/devconnect-ui',
        website: 'https://ui.devconnect.com',
      },
    });
    console.log('✅ Sample project created');
  }

  // Create sample idea
  const mike = await prisma.user.findUnique({ where: { email: 'mike@example.com' } });
  if (mike) {
    await prisma.startupIdea.upsert({
      where: { slug: 'ai-powered-code-review-assistant' },
      update: {},
      create: {
        authorId: mike.id,
        title: 'AI-Powered Code Review Assistant',
        slug: 'ai-powered-code-review-assistant',
        problem: 'Code reviews are time-consuming and inconsistent across teams. Developers spend hours reviewing code manually, often missing critical issues.',
        solution: 'Use AI to provide instant, consistent code review feedback with smart suggestions and explanations.',
        targetMarket: 'Development teams and individual developers',
        description: 'An intelligent tool that reviews your code and suggests improvements using machine learning',
        businessModel: 'SaaS subscription model with free tier for open source',
        isLookingForCofounder: true,
      },
    });
    console.log('✅ Sample idea created');
  }

  console.log('\n✨ Database seeded successfully!\n');
  console.log('='.repeat(50));
  console.log('📋 LOGIN CREDENTIALS');
  console.log('='.repeat(50));
  console.log('\n🔴 SUPER ADMIN:');
  console.log('   Email: superadmin@devconnect.com');
  console.log('   Password: SuperAdmin@123');
  console.log('\n🟠 ADMIN:');
  console.log('   Email: admin@devconnect.com');
  console.log('   Password: Admin@123');
  console.log('\n🔵 MODERATOR:');
  console.log('   Email: moderator@devconnect.com');
  console.log('   Password: Moderator@123');
  console.log('\n🟢 DEMO USERS (all use same password):');
  console.log('   Password: Demo@123');
  console.log('   - john@example.com (johndoe)');
  console.log('   - jane@example.com (janesmith)');
  console.log('   - mike@example.com (mikedev)');
  console.log('   - sarah@example.com (sarahcoder)');
  console.log('   - alex@example.com (alextech)');
  console.log('\n' + '='.repeat(50));
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
