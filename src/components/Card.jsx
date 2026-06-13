import { cn } from "@/lib/utils"

export default function Card({ children, className, noPadding = false }) {
  return (
    <div className={cn("bg-white rounded-card border border-gray-100", noPadding ? "" : "p-4", className)}>
      {children}
    </div>
  )
}
