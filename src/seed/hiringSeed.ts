import mongoose from 'mongoose';
import config from '../config';
import { Job } from '../app/modules/hiring/job.model';
import { Application } from '../app/modules/hiring/application.model';

const MOCK_JOBS = [
  {
    title: 'Senior Software Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    salary: '$120k - $160k',
    description: 'We are looking for an experienced software engineer to join our team.',
    requirements: ['5+ years of experience', 'React, Node.js, TypeScript', 'AWS experience'],
    responsibilities: ['Design and develop scalable applications', 'Mentor junior developers'],
    benefits: ['Health insurance', 'Remote work', '401k matching'],
    status: 'active',
    postedBy: {
      id: '507f1f77bcf86cd799439011',
      name: 'HR Manager',
      role: 'hr',
    },
  },
  {
    title: 'Product Manager',
    department: 'Product',
    location: 'New York, NY',
    type: 'Full-time',
    salary: '$130k - $170k',
    description: 'Lead product strategy and execution for our flagship products.',
    requirements: ['7+ years in product management', 'Technical background', 'Excellent communication'],
    responsibilities: ['Define product roadmap', 'Collaborate with engineering'],
    benefits: ['Health insurance', 'Stock options', 'Flexible hours'],
    status: 'active',
    postedBy: {
      id: '507f1f77bcf86cd799439011',
      name: 'HR Manager',
      role: 'hr',
    },
  },
  {
    title: 'UX Designer',
    department: 'Design',
    location: 'San Francisco, CA',
    type: 'Full-time',
    salary: '$100k - $140k',
    description: 'Create beautiful and intuitive user experiences.',
    requirements: ['4+ years of UX design', 'Figma expertise', 'Portfolio required'],
    responsibilities: ['Design user interfaces', 'Conduct user research'],
    benefits: ['Health insurance', 'Creative workspace', 'Learning budget'],
    status: 'active',
    postedBy: {
      id: '507f1f77bcf86cd799439011',
      name: 'HR Manager',
      role: 'hr',
    },
  },
  {
    title: 'Marketing Specialist',
    department: 'Marketing',
    location: 'Remote',
    type: 'Contract',
    salary: '$80k - $100k',
    description: 'Drive marketing campaigns and brand awareness.',
    requirements: ['3+ years marketing experience', 'SEO/SEM knowledge', 'Content creation'],
    responsibilities: ['Manage marketing campaigns', 'Analyze metrics'],
    benefits: ['Remote work', 'Flexible schedule', 'Performance bonus'],
    status: 'active',
    postedBy: {
      id: '507f1f77bcf86cd799439011',
      name: 'HR Manager',
      role: 'hr',
    },
  },
];

const generateApplications = (jobId: string) => {
  const applications = [
    {
      jobId,
      name: 'Sarah Johnson',
      email: 'sarah.j@example.com',
      phone: '+1 (555) 123-4567',
      location: 'San Francisco, CA',
      experience: '5 years',
      education: 'BS Computer Science',
      currentCompany: 'Tech Corp',
      skills: ['React', 'Node.js', 'TypeScript', 'AWS'],
      atsScore: 95,
      status: 'pending',
    },
    {
      jobId,
      name: 'Michael Chen',
      email: 'mchen@example.com',
      phone: '+1 (555) 234-5678',
      location: 'New York, NY',
      experience: '7 years',
      education: 'MS Software Engineering',
      currentCompany: 'Innovation Labs',
      skills: ['Python', 'Java', 'Kubernetes', 'Docker'],
      atsScore: 92,
      status: 'pending',
    },
    {
      jobId,
      name: 'Emily Rodriguez',
      email: 'emily.r@example.com',
      phone: '+1 (555) 345-6789',
      location: 'Austin, TX',
      experience: '4 years',
      education: 'BS Information Technology',
      currentCompany: 'StartupXYZ',
      skills: ['Vue.js', 'Django', 'PostgreSQL', 'Redis'],
      atsScore: 88,
      status: 'pending',
    },
    {
      jobId,
      name: 'David Kim',
      email: 'david.kim@example.com',
      phone: '+1 (555) 456-7890',
      location: 'Seattle, WA',
      experience: '6 years',
      education: 'BS Computer Engineering',
      currentCompany: 'Cloud Solutions Inc',
      skills: ['Angular', 'C#', 'Azure', 'MongoDB'],
      atsScore: 85,
      status: 'pending',
    },
    {
      jobId,
      name: 'Jessica Martinez',
      email: 'j.martinez@example.com',
      phone: '+1 (555) 567-8901',
      location: 'Boston, MA',
      experience: '3 years',
      education: 'BS Software Development',
      currentCompany: 'Digital Agency',
      skills: ['JavaScript', 'PHP', 'MySQL', 'Git'],
      atsScore: 78,
      status: 'pending',
    },
    {
      jobId,
      name: 'Robert Taylor',
      email: 'rtaylor@example.com',
      phone: '+1 (555) 678-9012',
      location: 'Chicago, IL',
      experience: '8 years',
      education: 'MS Computer Science',
      currentCompany: 'Enterprise Systems',
      skills: ['Ruby', 'Rails', 'GraphQL', 'Redis'],
      atsScore: 72,
      status: 'pending',
    },
  ];

  return applications;
};

async function seedHiringData() {
  try {
    await mongoose.connect(config.database_url as string);
    console.log('🔗 Connected to database');

    // Check if data already exists
    const existingJobs = await Job.countDocuments();
    if (existingJobs > 0) {
      console.log('⚠️  Hiring data already exists. Use --force to override.');
      process.exit(0);
    }

    // Create jobs
    console.log('📝 Creating jobs...');
    const createdJobs = await Job.insertMany(MOCK_JOBS);
    console.log(`✅ Created ${createdJobs.length} jobs`);

    // Create applications for each job
    console.log('📄 Creating applications...');
    let totalApplications = 0;

    for (const job of createdJobs) {
      const applications = generateApplications(job._id.toString());
      await Application.insertMany(applications);
      totalApplications += applications.length;

      // Update job applicant count
      await Job.findByIdAndUpdate(job._id, {
        applicantCount: applications.length,
      });
    }

    console.log(`✅ Created ${totalApplications} applications`);
    console.log('✨ Hiring data seeded successfully!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding hiring data:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Check for force flag
const forceMode = process.argv.includes('--force');

if (forceMode) {
  mongoose
    .connect(config.database_url as string)
    .then(async () => {
      console.log('🗑️  Deleting existing hiring data...');
      await Job.deleteMany({});
      await Application.deleteMany({});
      console.log('✅ Deleted existing data');
      await mongoose.connection.close();
      seedHiringData();
    })
    .catch((err) => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
} else {
  seedHiringData();
}
