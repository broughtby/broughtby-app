const bcrypt = require('bcrypt');
const db = require('../config/database');

const sampleAmbassadors = [
  {
    email: 'sarah.wellness@example.com',
    password: 'password123',
    name: 'Sarah Mitchell',
    profile_photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    bio: 'Wellness and lifestyle influencer with 150K+ followers. Passionate about holistic health, yoga, and sustainable living. Brand partnerships with Lululemon, Alo Yoga, and Whole Foods.',
    location: 'Los Angeles, CA',
    age: 28,
    skills: ['Social Media Marketing', 'Content Creation', 'Photography', 'Wellness', 'Lifestyle'],
    hourly_rate: 250,
    availability: 'Full-time',
    rating: 4.9,
  },
  {
    email: 'marcus.tech@example.com',
    password: 'password123',
    name: 'Marcus Chen',
    profile_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    bio: 'Tech reviewer and early adopter with expertise in consumer electronics. 200K YouTube subscribers. Previously worked with Apple, Samsung, and Sony on product launches.',
    location: 'San Francisco, CA',
    age: 32,
    skills: ['Video Production', 'Tech Reviews', 'Public Speaking', 'Product Testing', 'YouTube'],
    hourly_rate: 300,
    availability: 'Part-time',
    rating: 4.8,
  },
  {
    email: 'emma.fashion@example.com',
    password: 'password123',
    name: 'Emma Rodriguez',
    profile_photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    bio: 'Fashion and beauty content creator specializing in sustainable fashion. Featured in Vogue and Elle. Collaborated with Reformation, Everlane, and Glossier.',
    location: 'New York, NY',
    age: 26,
    skills: ['Fashion Styling', 'Brand Partnerships', 'Instagram Marketing', 'Sustainable Fashion', 'Event Hosting'],
    hourly_rate: 275,
    availability: 'Full-time',
    rating: 5.0,
  },
  {
    email: 'james.fitness@example.com',
    password: 'password123',
    name: 'James Patterson',
    profile_photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    bio: 'Certified personal trainer and fitness coach with 180K followers. Specializing in strength training and nutrition. Brand ambassador for Nike, MyProtein, and Fitbit.',
    location: 'Austin, TX',
    age: 30,
    skills: ['Fitness Training', 'Nutrition Coaching', 'Video Content', 'Brand Ambassador', 'Community Building'],
    hourly_rate: 225,
    availability: 'Full-time',
    rating: 4.7,
  },
  {
    email: 'olivia.food@example.com',
    password: 'password123',
    name: 'Olivia Thompson',
    profile_photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    bio: 'Food blogger and recipe developer with 250K Instagram followers. Specializing in plant-based cuisine. Worked with HelloFresh, Blue Apron, and Whole Foods.',
    location: 'Portland, OR',
    age: 29,
    skills: ['Food Photography', 'Recipe Development', 'Content Creation', 'Brand Storytelling', 'Social Media'],
    hourly_rate: 200,
    availability: 'Part-time',
    rating: 4.9,
  },
  {
    email: 'alex.travel@example.com',
    password: 'password123',
    name: 'Alex Rivera',
    profile_photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
    bio: 'Travel photographer and adventure enthusiast. 300K+ followers across platforms. Brand partnerships with GoPro, Airbnb, and Patagonia. Specializing in outdoor and adventure content.',
    location: 'Denver, CO',
    age: 31,
    skills: ['Photography', 'Videography', 'Travel Writing', 'Adventure Sports', 'Drone Operation'],
    hourly_rate: 280,
    availability: 'Flexible',
    rating: 4.8,
  },
  {
    email: 'sophia.beauty@example.com',
    password: 'password123',
    name: 'Sophia Lee',
    profile_photo: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400',
    bio: 'Beauty and skincare expert with professional makeup artistry background. 175K TikTok followers. Collaborated with Sephora, Fenty Beauty, and The Ordinary.',
    location: 'Miami, FL',
    age: 27,
    skills: ['Makeup Artistry', 'Skincare Education', 'TikTok Marketing', 'Tutorial Creation', 'Product Reviews'],
    hourly_rate: 240,
    availability: 'Full-time',
    rating: 4.9,
  },
];

const sampleBrands = [
  {
    email: 'team@luxewellness.com',
    password: 'password123',
    name: 'Jessica Chen',
    company_name: 'Luxe Wellness Co.',
    company_logo: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400',
    company_website: null,
    contact_title: 'Marketing Director',
    profile_photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
    bio: 'Premium wellness brand offering organic supplements and holistic health products. Looking for authentic ambassadors to promote our new product line.',
    location: 'Santa Monica, CA',
    age: null,
    skills: ['Wellness Products', 'Organic Supplements', 'Health & Lifestyle'],
    hourly_rate: null,
    availability: null,
    rating: 0,
  },
  {
    email: 'partnerships@techfusion.com',
    password: 'password123',
    name: 'Michael Torres',
    company_name: 'TechFusion',
    company_logo: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400',
    company_website: null,
    contact_title: 'Partnerships Manager',
    profile_photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    bio: 'Innovative tech startup specializing in smart home devices. Seeking tech-savvy ambassadors for our product launch campaign.',
    location: 'San Francisco, CA',
    age: null,
    skills: ['Smart Home Tech', 'IoT Devices', 'Consumer Electronics'],
    hourly_rate: null,
    availability: null,
    rating: 0,
  },
  {
    email: 'brand@ecochic.com',
    password: 'password123',
    name: 'Sarah Anderson',
    company_name: 'EcoChic Fashion',
    company_logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
    company_website: null,
    contact_title: 'Brand Manager',
    profile_photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
    bio: 'Sustainable fashion brand committed to ethical manufacturing. Looking for fashion influencers who share our values of sustainability and style.',
    location: 'Brooklyn, NY',
    age: null,
    skills: ['Sustainable Fashion', 'Ethical Manufacturing', 'Contemporary Style'],
    hourly_rate: null,
    availability: null,
    rating: 0,
  },
  {
    email: 'hello@fitforge.com',
    password: 'password123',
    name: 'David Kim',
    company_name: 'FitForge Athletics',
    company_logo: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400',
    company_website: null,
    contact_title: 'Community Director',
    profile_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    bio: 'Performance athletic wear brand for serious athletes. Seeking fitness ambassadors to represent our brand at events and on social media.',
    location: 'Austin, TX',
    age: null,
    skills: ['Athletic Apparel', 'Performance Gear', 'Fitness Community'],
    hourly_rate: null,
    availability: null,
    rating: 0,
  },
  {
    email: 'contact@greenbite.com',
    password: 'password123',
    name: 'Rachel Green',
    company_name: 'GreenBite Foods',
    company_logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
    company_website: null,
    contact_title: 'Marketing Coordinator',
    profile_photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    bio: 'Plant-based meal delivery service bringing healthy, delicious food to busy professionals. Looking for food content creators to showcase our meals.',
    location: 'Seattle, WA',
    age: null,
    skills: ['Plant-Based Food', 'Meal Delivery', 'Healthy Eating'],
    hourly_rate: null,
    availability: null,
    rating: 0,
  },
  {
    email: 'team@wanderluxe.com',
    password: 'password123',
    name: 'Alex Martinez',
    company_name: 'WanderLuxe Travel',
    company_logo: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400',
    company_website: null,
    contact_title: 'Influencer Relations',
    profile_photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    bio: 'Luxury travel accessories brand for modern adventurers. Seeking travel influencers to feature our products in exotic locations.',
    location: 'San Diego, CA',
    age: null,
    skills: ['Travel Accessories', 'Luxury Goods', 'Adventure Travel'],
    hourly_rate: null,
    availability: null,
    rating: 0,
  },
  {
    email: 'info@glownatural.com',
    password: 'password123',
    name: 'Emma Wilson',
    company_name: 'Glow Natural Beauty',
    company_logo: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
    company_website: null,
    contact_title: 'Brand Partnerships Lead',
    profile_photo: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400',
    bio: 'Clean beauty brand with natural, cruelty-free skincare products. Looking for beauty influencers to create authentic content featuring our products.',
    location: 'Los Angeles, CA',
    age: null,
    skills: ['Clean Beauty', 'Natural Skincare', 'Cruelty-Free Products'],
    hourly_rate: null,
    availability: null,
    rating: 0,
  },
];

async function seedDatabase() {
  const client = await db.pool.connect();

  try {
    console.log('Starting database seed...');

    await client.query('BEGIN');

    // Clear existing data
    console.log('Clearing existing data...');
    await client.query('DELETE FROM messages');
    await client.query('DELETE FROM matches');
    await client.query('DELETE FROM likes');
    await client.query('DELETE FROM users');
    await client.query('ALTER SEQUENCE users_id_seq RESTART WITH 1');

    // Insert ambassadors
    console.log('Inserting brand ambassadors...');
    for (const ambassador of sampleAmbassadors) {
      const hashedPassword = await bcrypt.hash(ambassador.password, 10);

      await client.query(
        `INSERT INTO users (email, password_hash, role, name, profile_photo, bio, location, age, skills, hourly_rate, availability, rating)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          ambassador.email,
          hashedPassword,
          'ambassador',
          ambassador.name,
          ambassador.profile_photo,
          ambassador.bio,
          ambassador.location,
          ambassador.age,
          ambassador.skills,
          ambassador.hourly_rate,
          ambassador.availability,
          ambassador.rating,
        ]
      );
    }

    // Insert brands
    console.log('Inserting brands...');
    for (const brand of sampleBrands) {
      const hashedPassword = await bcrypt.hash(brand.password, 10);

      await client.query(
        `INSERT INTO users (email, password_hash, role, name, profile_photo, bio, location, skills, company_name, company_logo, company_website, contact_title)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          brand.email,
          hashedPassword,
          'brand',
          brand.name,
          brand.profile_photo,
          brand.bio,
          brand.location,
          brand.skills,
          brand.company_name,
          brand.company_logo,
          brand.company_website,
          brand.contact_title,
        ]
      );
    }

    await client.query('COMMIT');

    console.log('✓ Database seeded successfully!');
    console.log(`  - ${sampleAmbassadors.length} brand ambassadors added`);
    console.log(`  - ${sampleBrands.length} brands added`);
    console.log('\nSample credentials:');
    console.log('  Ambassador: sarah.wellness@example.com / password123');
    console.log('  Brand: team@luxewellness.com / password123');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('✗ Seed failed:', error);
    throw error;
  } finally {
    client.release();
    await db.pool.end();
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedDatabase;
