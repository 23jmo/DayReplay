import { cn } from "@/lib/utils"

interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  text: string
}

function getColorClass(text: string): string {
  if (text.includes('FPS')) {
    return 'bg-blue-100 text-blue-900 ring-blue-600/20'
  } else if (text.includes('Resolution')) {
    return 'bg-green-100 text-green-900 ring-green-600/20'
  } else if (text.includes('Interval')) {
    return 'bg-orange-100 text-orange-900 ring-orange-600/20'
  }
  return 'bg-gray-100 text-gray-900 ring-gray-600/20'
}

export function Tag({ text, className, ...props }: TagProps) {
  const colorClasses = getColorClass(text)

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset hover:bg-opacity-40",
        "transition-colors duration-200 ease-in-out bg-opacity-70",
        colorClasses,
        className
      )}
      {...props}
    >
      {text}
    </span>
  )
}
