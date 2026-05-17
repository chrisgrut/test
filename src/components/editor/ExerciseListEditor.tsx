import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { createId } from '@/lib/ids'
import type { Exercise } from '@/types/domain'

interface ExerciseListEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  exercises: Exercise[]
  onChange: (next: Exercise[]) => void
  minLength?: number
}

export function ExerciseListEditor({
  open,
  onOpenChange,
  title,
  description,
  exercises,
  onChange,
  minLength = 1,
}: ExerciseListEditorProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  function update(id: string, name: string) {
    onChange(exercises.map((e) => (e.id === id ? { ...e, name } : e)))
  }

  function move(id: string, direction: -1 | 1) {
    const idx = exercises.findIndex((e) => e.id === id)
    const target = idx + direction
    if (idx === -1 || target < 0 || target >= exercises.length) return
    const next = [...exercises]
    const current = next[idx]
    const swap = next[target]
    if (!current || !swap) return
    next[idx] = swap
    next[target] = current
    onChange(next)
  }

  function add() {
    const next: Exercise = { id: createId(), name: '' }
    onChange([...exercises, next])
    setTimeout(() => {
      const el = document.getElementById(`exercise-input-${next.id}`)
      if (el instanceof HTMLInputElement) {
        el.focus()
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 50)
  }

  function confirmDelete() {
    if (pendingDeleteId === null) return
    onChange(exercises.filter((e) => e.id !== pendingDeleteId))
    setPendingDeleteId(null)
  }

  const pendingDelete = exercises.find((e) => e.id === pendingDeleteId)
  const canDelete = exercises.length > minLength

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="flex h-[88vh] flex-col p-0">
          <SheetHeader className="border-b-2 border-border">
            <SheetTitle>{title}</SheetTitle>
            {description ? <SheetDescription>{description}</SheetDescription> : null}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4">
            <Button
              type="button"
              variant="default"
              size="lg"
              className="mb-3 w-full"
              onClick={add}
            >
              <Plus className="h-6 w-6" />
              Neue Übung
            </Button>

            <ol className="flex flex-col gap-2">
              {exercises.map((ex, i) => (
                <li
                  key={ex.id}
                  className="flex items-stretch gap-2 rounded-2xl border-2 border-border bg-background p-2"
                >
                  <div className="flex w-10 shrink-0 items-center justify-center text-xl font-black text-muted-foreground">
                    {i + 1}
                  </div>
                  <Input
                    id={`exercise-input-${ex.id}`}
                    value={ex.name}
                    onChange={(e) => update(ex.id, e.target.value)}
                    placeholder="Übungsname"
                    className="flex-1"
                  />
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      variant="neutral"
                      size="sm"
                      onClick={() => move(ex.id, -1)}
                      disabled={i === 0}
                      aria-label="Nach oben verschieben"
                      className="h-7"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="neutral"
                      size="sm"
                      onClick={() => move(ex.id, 1)}
                      disabled={i === exercises.length - 1}
                      aria-label="Nach unten verschieben"
                      className="h-7"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => setPendingDeleteId(ex.id)}
                    disabled={!canDelete}
                    aria-label="Übung löschen"
                  >
                    <Trash2 className="h-6 w-6" />
                  </Button>
                </li>
              ))}
            </ol>
          </div>

          <SheetFooter>
            <Button type="button" variant="default" size="lg" onClick={() => onOpenChange(false)}>
              Fertig
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => !o && setPendingDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Übung löschen?</DialogTitle>
            <DialogDescription>
              „{pendingDelete?.name || 'Unbenannt'}" wird entfernt. Diese Aktion lässt sich nicht
              rückgängig machen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="neutral" size="lg" onClick={() => setPendingDeleteId(null)}>
              Abbrechen
            </Button>
            <Button variant="destructive" size="lg" onClick={confirmDelete}>
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
