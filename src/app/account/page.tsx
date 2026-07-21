import { createClient } from '@/lib/supabase/server';
import { db, safeQuery } from '@/lib/db/client';
import { users, userAlerts, bookmarks } from '@/lib/db/schema/users';
import { countries } from '@/lib/db/schema/shared';
import { jobs } from '@/lib/db/schema/jobs';
import { tenders } from '@/lib/db/schema/tenders';
import { eq, and, desc } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateProfile, createAlert, deleteAlert, toggleAlert } from './actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, User, Trash2, Bookmark } from 'lucide-react';
import { JobCard } from '@/components/jobs/JobCard';
import { TenderCard } from '@/components/tenders/TenderCard';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // seconds — Vercel Hobby allows up to 60s

export const metadata = {
  title: 'My Account | AkiliBrain',
  description: 'Manage your AkiliBrain profile and alerts.',
};

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Run all DB queries in parallel to avoid sequential waterfall latency
  const [dbUserResult, alerts, allCountries, userBookmarks] = await Promise.all([
    safeQuery(db.select().from(users).where(eq(users.id, user.id))),
    safeQuery(db.select().from(userAlerts).where(eq(userAlerts.userId, user.id))),
    safeQuery(db.select().from(countries)),
    safeQuery(
      db.select({
        bookmark: bookmarks,
        job: jobs,
        tender: tenders,
      })
      .from(bookmarks)
      .where(eq(bookmarks.userId, user.id))
      .leftJoin(jobs, and(eq(bookmarks.itemId, jobs.id), eq(bookmarks.itemType, 'job')))
      .leftJoin(tenders, and(eq(bookmarks.itemId, tenders.id), eq(bookmarks.itemType, 'tender')))
      .orderBy(desc(bookmarks.createdAt))
    )
  ]);

  const dbUser = dbUserResult[0];

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Account</h1>
          <p className="text-muted-foreground">Manage your profile, preferences, and alerts.</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-6 bg-white/5 border border-white/10 p-1">
            <TabsTrigger value="profile" className="flex items-center gap-2 px-4">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="bookmarks" className="flex items-center gap-2 px-4">
              <Bookmark className="w-4 h-4" />
              Saved Items
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2 px-4">
              <Bell className="w-4 h-4" />
              Alerts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <div className="rounded-xl border border-white/10 bg-black/40 p-6 md:p-8 backdrop-blur-xl">
              <h2 className="text-xl font-semibold mb-6">Personal Information</h2>
              
              <form action={updateProfile} className="space-y-6 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={user.email || ''} 
                    disabled 
                    className="bg-white/5 opacity-70"
                  />
                  <p className="text-xs text-muted-foreground">Your email is managed by your sign-in provider.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input 
                    id="fullName" 
                    name="fullName" 
                    defaultValue={dbUser?.fullName || ''} 
                    placeholder="John Doe"
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="countryId">Default Country</Label>
                  <Select 
                    name="countryId" 
                    defaultValue={dbUser?.countryId || ''}
                    items={allCountries.map(c => ({ value: c.id, label: c.name }))}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCountries.map(c => (
                        <SelectItem key={c.id} value={c.id} label={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full">Save Changes</Button>
              </form>
            </div>
            
            {dbUser?.isPro && (
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-6 backdrop-blur-xl">
                <h2 className="text-xl font-semibold mb-2 flex items-center gap-2 text-indigo-400">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  Pro Subscription Active
                </h2>
                <p className="text-muted-foreground mb-4">
                  Your Pro access is valid until {dbUser.proExpiresAt ? new Date(dbUser.proExpiresAt).toLocaleDateString() : 'forever'}.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookmarks" className="space-y-6">
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold">Your Saved Items</h2>
              {(!userBookmarks || userBookmarks.length === 0) ? (
                <div className="rounded-xl border border-dashed border-white/20 p-12 text-center text-muted-foreground">
                  You haven't saved any items yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userBookmarks.map(({ bookmark, job, tender }) => {
                    if (bookmark.itemType === 'job' && job) {
                      return (
                        <JobCard
                          key={bookmark.id}
                          id={job.id}
                          title={job.title}
                          companyName={job.companyName}
                          description={job.description}
                          requirements={job.requirements}
                          location={job.location}
                          country={allCountries.find(c => c.id === job.countryId)?.name || 'Africa'}
                          jobType={job.jobType ?? 'full_time'}
                          sourceUrl={job.sourceUrl}
                          postedDate={job.postedDate}
                          deadline={job.deadline}
                          layout="grid"
                        />
                      );
                    }
                    if (bookmark.itemType === 'tender' && tender) {
                      return (
                        <TenderCard
                          key={bookmark.id}
                          id={tender.id}
                          title={tender.title}
                          buyerName={tender.buyerName}
                          description={tender.description}
                          location={tender.location}
                          country={allCountries.find(c => c.id === tender.countryId)?.name || 'Africa'}
                          tenderType={tender.tenderType ?? 'works'}
                          sourceUrl={tender.sourceUrl}
                          postedDate={tender.postedDate}
                          deadline={tender.deadline}
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <div className="rounded-xl border border-white/10 bg-black/40 p-6 md:p-8 backdrop-blur-xl">
              <h2 className="text-xl font-semibold mb-2">Create New Alert</h2>
              <p className="text-sm text-muted-foreground mb-6">Get notified when new data matches your interests.</p>
              
              <form action={createAlert} className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="module">Module</Label>
                    <Select name="module" required items={[
                      { value: 'tenders', label: 'Tenders' },
                      { value: 'jobs', label: 'Jobs' },
                      { value: 'compliance', label: 'Compliance' },
                      { value: 'health', label: 'Health Data' }
                    ]}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select module" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tenders" label="Tenders">Tenders</SelectItem>
                        <SelectItem value="jobs" label="Jobs">Jobs</SelectItem>
                        <SelectItem value="compliance" label="Compliance">Compliance</SelectItem>
                        <SelectItem value="health" label="Health Data">Health Data</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select name="frequency" defaultValue="daily" items={[
                      { value: 'immediate', label: 'Immediate' },
                      { value: 'daily', label: 'Daily Digest' },
                      { value: 'weekly', label: 'Weekly Summary' }
                    ]}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate" label="Immediate">Immediate</SelectItem>
                        <SelectItem value="daily" label="Daily Digest">Daily Digest</SelectItem>
                        <SelectItem value="weekly" label="Weekly Summary">Weekly Summary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keywords">Keywords (comma separated)</Label>
                  <Input 
                    id="keywords" 
                    name="keywords" 
                    placeholder="e.g. software, IT, cloud" 
                    required 
                    className="bg-background"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="alertCountry">Country Filter (Optional)</Label>
                  <Select name="countryId" items={[
                    { value: '', label: 'Any country' },
                    ...allCountries.map(c => ({ value: c.id, label: c.name }))
                  ]}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Any country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" label="Any country">Any country</SelectItem>
                      {allCountries.map(c => (
                        <SelectItem key={c.id} value={c.id} label={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" variant="default" className="w-full md:w-auto">Create Alert</Button>
              </form>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold mt-8">Your Alerts</h2>
              
              {alerts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/20 p-12 text-center text-muted-foreground">
                  You don't have any alerts yet. Create one above to stay updated.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="relative p-5 rounded-xl border border-white/10 bg-white/5 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <span className="px-2 py-1 bg-white/10 rounded text-xs font-medium uppercase tracking-wider">
                          {alert.module}
                        </span>
                        
                        <form action={async () => {
                          'use server';
                          await deleteAlert(alert.id);
                        }}>
                          <Button variant="ghost" size="icon" type="submit" className="h-8 w-8 text-muted-foreground hover:text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </form>
                      </div>
                      
                      <div className="mt-2">
                        <p className="font-medium text-lg leading-tight flex flex-wrap gap-1">
                          {alert.keywords?.map((kw: string, i: number) => (
                            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded bg-primary/20 text-primary text-sm">
                              {kw}
                            </span>
                          ))}
                        </p>
                      </div>
                      
                      <div className="mt-auto pt-4 flex items-center justify-between text-sm text-muted-foreground">
                        <span className="capitalize">{alert.frequency}</span>
                        <form action={async () => {
                          'use server';
                          await toggleAlert(alert.id, !alert.isActive);
                        }}>
                          <button type="submit" className={`text-xs font-medium px-2 py-1 rounded ${alert.isActive ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-muted-foreground'}`}>
                            {alert.isActive ? 'Active' : 'Paused'}
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
