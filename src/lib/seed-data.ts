import { supabaseAdmin } from './supabase';

export interface SeedData {
  organizations: any[];
  users: any[];
  groups: any[];
  courses: any[];
  lessons: any[];
  quizzes: any[];
  badges: any[];
}

export class DatabaseSeeder {
  /**
   * Create a super admin user
   */
  static async createSuperAdmin(email: string, password: string): Promise<string | null> {
    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (authError || !authData.user) {
        console.error('Error creating super admin user:', authError);
        return null;
      }

      // Create user record in our users table
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          organization_id: '00000000-0000-0000-0000-000000000000', // System organization
          role: 'super_admin',
          profile_data: {
            first_name: 'Super',
            last_name: 'Admin',
            avatar_url: null
          },
          points: 0,
          level: 1
        })
        .select()
        .single();

      if (userError) {
        console.error('Error creating super admin user record:', userError);
        return null;
      }

      console.log('✓ Super admin user created successfully');
      return userData.id;
    } catch (error) {
      console.error('Error creating super admin:', error);
      return null;
    }
  }

  /**
   * Create a sample organization with admin user
   */
  static async createSampleOrganization(
    orgName: string,
    orgSlug: string,
    adminEmail: string,
    adminPassword: string
  ): Promise<{ organizationId: string; adminId: string } | null> {
    try {
      // Create organization
      const { data: orgData, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert({
          name: orgName,
          slug: orgSlug,
          branding_config: {
            logo_url: null,
            primary_color: '#3b82f6',
            secondary_color: '#1e40af',
            custom_css: null
          },
          theme_config: {
            theme: 'default',
            font_family: 'Inter',
            font_size: 'medium'
          }
        })
        .select()
        .single();

      if (orgError || !orgData) {
        console.error('Error creating organization:', orgError);
        return null;
      }

      // Create admin user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true
      });

      if (authError || !authData.user) {
        console.error('Error creating admin user:', authError);
        return null;
      }

      // Create admin user record
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email: adminEmail,
          organization_id: orgData.id,
          role: 'org_admin',
          profile_data: {
            first_name: 'Organization',
            last_name: 'Admin',
            avatar_url: null
          },
          points: 0,
          level: 1
        })
        .select()
        .single();

      if (userError) {
        console.error('Error creating admin user record:', userError);
        return null;
      }

      console.log(`✓ Sample organization "${orgName}" created with admin user`);
      return {
        organizationId: orgData.id,
        adminId: userData.id
      };
    } catch (error) {
      console.error('Error creating sample organization:', error);
      return null;
    }
  }

  /**
   * Create sample courses for an organization
   */
  static async createSampleCourses(organizationId: string, createdBy: string): Promise<string[]> {
    try {
      const courses = [
        {
          organization_id: organizationId,
          title: 'Welcome to LogosLMS',
          description: 'Get started with our learning management system',
          content: {
            overview: 'This course will introduce you to the LogosLMS platform and its features.',
            objectives: [
              'Understand the platform interface',
              'Learn how to navigate courses',
              'Complete your first lesson'
            ],
            estimated_duration: '30 minutes'
          },
          created_by: createdBy,
          status: 'published'
        },
        {
          organization_id: organizationId,
          title: 'Advanced Learning Techniques',
          description: 'Master effective learning strategies',
          content: {
            overview: 'Learn advanced techniques to maximize your learning potential.',
            objectives: [
              'Understand different learning styles',
              'Apply spaced repetition techniques',
              'Create effective study schedules'
            ],
            estimated_duration: '2 hours'
          },
          created_by: createdBy,
          status: 'published'
        },
        {
          organization_id: organizationId,
          title: 'AI-Powered Learning',
          description: 'Leverage AI for personalized learning experiences',
          content: {
            overview: 'Discover how AI can enhance your learning journey.',
            objectives: [
              'Understand AI coaching features',
              'Use personalized recommendations',
              'Track learning progress with AI insights'
            ],
            estimated_duration: '1.5 hours'
          },
          created_by: createdBy,
          status: 'draft'
        }
      ];

      const { data: coursesData, error: coursesError } = await supabaseAdmin
        .from('courses')
        .insert(courses)
        .select('id');

      if (coursesError || !coursesData) {
        console.error('Error creating sample courses:', coursesError);
        return [];
      }

      console.log(`✓ Created ${coursesData.length} sample courses`);
      return coursesData.map(c => c.id);
    } catch (error) {
      console.error('Error creating sample courses:', error);
      return [];
    }
  }

  /**
   * Create sample lessons for courses
   */
  static async createSampleLessons(courseIds: string[]): Promise<void> {
    try {
      const lessons = [];

      for (const courseId of courseIds) {
        // Get course title to create relevant lessons
        const { data: course } = await supabaseAdmin
          .from('courses')
          .select('title')
          .eq('id', courseId)
          .single();

        if (course?.title === 'Welcome to LogosLMS') {
          lessons.push(
            {
              course_id: courseId,
              title: 'Platform Overview',
              content: {
                type: 'text',
                content: 'Welcome to LogosLMS! This platform provides a comprehensive learning experience with AI-powered coaching and gamification features.',
                media: null
              },
              order_index: 1
            },
            {
              course_id: courseId,
              title: 'Navigation Basics',
              content: {
                type: 'text',
                content: 'Learn how to navigate through courses, access your dashboard, and track your progress.',
                media: null
              },
              order_index: 2
            },
            {
              course_id: courseId,
              title: 'Your First Quiz',
              content: {
                type: 'text',
                content: 'Complete this quiz to test your understanding of the platform basics.',
                media: null
              },
              order_index: 3
            }
          );
        } else if (course?.title === 'Advanced Learning Techniques') {
          lessons.push(
            {
              course_id: courseId,
              title: 'Understanding Learning Styles',
              content: {
                type: 'text',
                content: 'Discover your unique learning style and how to leverage it for better retention.',
                media: null
              },
              order_index: 1
            },
            {
              course_id: courseId,
              title: 'Spaced Repetition',
              content: {
                type: 'text',
                content: 'Master the technique of spaced repetition to improve long-term memory retention.',
                media: null
              },
              order_index: 2
            },
            {
              course_id: courseId,
              title: 'Study Schedule Creation',
              content: {
                type: 'text',
                content: 'Learn how to create effective study schedules that work with your lifestyle.',
                media: null
              },
              order_index: 3
            }
          );
        }
      }

      if (lessons.length > 0) {
        const { error } = await supabaseAdmin
          .from('lessons')
          .insert(lessons);

        if (error) {
          console.error('Error creating sample lessons:', error);
        } else {
          console.log(`✓ Created ${lessons.length} sample lessons`);
        }
      }
    } catch (error) {
      console.error('Error creating sample lessons:', error);
    }
  }

  /**
   * Create sample quizzes for courses
   */
  static async createSampleQuizzes(courseIds: string[]): Promise<void> {
    try {
      const quizzes = [];

      for (const courseId of courseIds) {
        const { data: course } = await supabaseAdmin
          .from('courses')
          .select('title')
          .eq('id', courseId)
          .single();

        if (course?.title === 'Welcome to LogosLMS') {
          quizzes.push({
            course_id: courseId,
            title: 'Platform Basics Quiz',
            questions: [
              {
                id: 1,
                question: 'What is LogosLMS?',
                type: 'multiple_choice',
                options: [
                  'A learning management system',
                  'A social media platform',
                  'A gaming platform',
                  'A shopping website'
                ],
                correct_answer: 0,
                points: 10
              },
              {
                id: 2,
                question: 'Which features does LogosLMS offer?',
                type: 'multiple_choice',
                options: [
                  'AI-powered coaching only',
                  'Gamification only',
                  'Both AI coaching and gamification',
                  'None of the above'
                ],
                correct_answer: 2,
                points: 10
              }
            ],
            passing_score: 70,
            time_limit: 10
          });
        }
      }

      if (quizzes.length > 0) {
        const { error } = await supabaseAdmin
          .from('quizzes')
          .insert(quizzes);

        if (error) {
          console.error('Error creating sample quizzes:', error);
        } else {
          console.log(`✓ Created ${quizzes.length} sample quizzes`);
        }
      }
    } catch (error) {
      console.error('Error creating sample quizzes:', error);
    }
  }

  /**
   * Create sample groups for an organization
   */
  static async createSampleGroups(organizationId: string): Promise<void> {
    try {
      const groups = [
        {
          organization_id: organizationId,
          name: 'New Learners',
          description: 'Group for users who are new to the platform'
        },
        {
          organization_id: organizationId,
          name: 'Advanced Users',
          description: 'Group for experienced learners'
        },
        {
          organization_id: organizationId,
          name: 'Mentors',
          description: 'Group for course creators and mentors'
        }
      ];

      const { error } = await supabaseAdmin
        .from('groups')
        .insert(groups);

      if (error) {
        console.error('Error creating sample groups:', error);
      } else {
        console.log('✓ Created sample groups');
      }
    } catch (error) {
      console.error('Error creating sample groups:', error);
    }
  }

  /**
   * Run complete database seeding
   */
  static async seedDatabase(): Promise<boolean> {
    try {
      console.log('Starting database seeding...');

      // Create super admin
      const superAdminId = await this.createSuperAdmin(
        'admin@logoslms.com',
        'SuperAdmin123!'
      );

      if (!superAdminId) {
        console.error('Failed to create super admin');
        return false;
      }

      // Create sample organization
      const orgData = await this.createSampleOrganization(
        'Acme Learning Corp',
        'acme-learning',
        'admin@acmelearning.com',
        'Admin123!'
      );

      if (!orgData) {
        console.error('Failed to create sample organization');
        return false;
      }

      // Create sample groups
      await this.createSampleGroups(orgData.organizationId);

      // Create sample courses
      const courseIds = await this.createSampleCourses(
        orgData.organizationId,
        orgData.adminId
      );

      if (courseIds.length > 0) {
        // Create sample lessons and quizzes
        await this.createSampleLessons(courseIds);
        await this.createSampleQuizzes(courseIds);
      }

      console.log('✓ Database seeding completed successfully!');
      return true;
    } catch (error) {
      console.error('Error seeding database:', error);
      return false;
    }
  }
}

// CLI interface for seeding
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'seed':
      DatabaseSeeder.seedDatabase().then(success => {
        process.exit(success ? 0 : 1);
      });
      break;
    case 'super-admin':
      const email = process.argv[3] || 'admin@logoslms.com';
      const password = process.argv[4] || 'SuperAdmin123!';
      DatabaseSeeder.createSuperAdmin(email, password).then(id => {
        if (id) {
          console.log('Super admin created with ID:', id);
        }
        process.exit(id ? 0 : 1);
      });
      break;
    default:
      console.log('Usage: node seed-data.js [seed|super-admin] [email] [password]');
      process.exit(1);
  }
}
