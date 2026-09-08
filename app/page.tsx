// import GoogleLoginButton from '@/components/homecomponent/auth/client'
// import { createClient } from '@/lib/supabase/server'
// import { cookies } from 'next/headers'

import { Hero, ProblemSection, WhoSection, JourneySection, NearPeerSection, PlatformSectionsBlock, MentorsSection, CoursesSection, ProjectsSection, CommunitySection, OpportunitiesSection, GrowthSection, FaqSection, CtaSection, SiteFooter } from "./server/landingserver";

// export default async function Page() {
//   const cookieStore = await cookies()
//   const supabase = createClient(cookieStore)

//   const { data: todos } = await supabase.from('todos').select()

//   return (


//     <>
//       <ul>
//       {todos?.map((todo) => (
//         <li key={todo.id}>{todo.name}</li>
//       ))}
//     </ul>

//     <GoogleLoginButton/>
//     </>
  
//   )
// }





export default function HomePage() {
  return (
    <main>
      <Hero />
      <ProblemSection />
      <WhoSection />
      <JourneySection />
      <NearPeerSection />
      <PlatformSectionsBlock />
      <MentorsSection />
      <CoursesSection />
      <ProjectsSection />
      <CommunitySection />
      <OpportunitiesSection />
      <GrowthSection />
      <FaqSection />
      <CtaSection />
      <SiteFooter />
    </main>
  );
}
