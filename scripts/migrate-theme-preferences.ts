// Migration script to add default theme preferences to existing users
// Run this once after deploying the theme feature

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateUserThemePreferences() {
  try {
    console.log('Starting theme preferences migration...')
    
    // Find all users and check their preferences
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        preferences: true
      }
    })
    
    console.log(`Found ${allUsers.length} total users`)
    
    // Filter users without theme preferences
    const usersWithoutTheme = allUsers.filter(user => {
      const prefs = user.preferences as Record<string, any> || {}
      return !prefs.theme
    })
    
    console.log(`Found ${usersWithoutTheme.length} users without theme preferences`)
    
    // Update each user with default theme preference
    let updated = 0
    for (const user of usersWithoutTheme) {
      const currentPreferences = (user.preferences as Record<string, any>) || {}
      
      const updatedPreferences = {
        ...currentPreferences,
        theme: 'system' // Default to system theme
      }
      
      await prisma.user.update({
        where: { id: user.id },
        data: { preferences: updatedPreferences }
      })
      
      updated++
    }
    
    console.log(`✅ Successfully updated ${updated} users with default theme preferences`)
  } catch (error) {
    console.error('❌ Error during migration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  migrateUserThemePreferences()
    .then(() => {
      console.log('Migration completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Migration failed:', error)
      process.exit(1)
    })
}

export default migrateUserThemePreferences
