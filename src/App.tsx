import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TabataMode } from '@/components/tabata/TabataMode'
import { RunningMode } from '@/components/running/RunningMode'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import type { TabId } from '@/types/domain'

export default function App() {
  const [tab, setTab] = useLocalStorage<TabId>('active-tab', 'tabata')

  return (
    <div className="flex min-h-full flex-col bg-background text-foreground">
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as TabId)}
        className="flex flex-1 flex-col"
      >
        <header className="sticky top-0 z-20 border-b-2 border-primary bg-background p-2">
          <TabsList>
            <TabsTrigger value="tabata">Tabata Warm-up</TabsTrigger>
            <TabsTrigger value="running">Feldweg Lauftraining</TabsTrigger>
          </TabsList>
        </header>

        <main className="flex-1">
          <TabsContent value="tabata" className="mt-0">
            <TabataMode />
          </TabsContent>
          <TabsContent value="running" className="mt-0">
            <RunningMode />
          </TabsContent>
        </main>
      </Tabs>
    </div>
  )
}
