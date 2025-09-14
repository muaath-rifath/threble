"use client"

import * as React from "react"
import {
  IconCalendar,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
} from "@/lib/icons"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"
import { format } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

// DatePicker Component
interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl border border-glass-border dark:border-glass-border-dark hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-200",
            !value && "text-black/60 dark:text-white/60",
            className
          )}
          disabled={disabled}
        >
          <IconCalendar className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 min-w-[320px] bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl border border-glass-border dark:border-glass-border-dark shadow-2xl shadow-black/10 dark:shadow-black/40">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          fromYear={1900}
          toYear={2100}
          selected={value}
          onSelect={(date) => {
            onChange?.(date)
            setOpen(false)
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-transparent p-4 w-full min-w-[280px]",
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "long" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-full", defaultClassNames.root),
        months: cn(
          "flex gap-4 flex-col md:flex-row relative w-full",
          defaultClassNames.months
        ),
        month: cn("flex flex-col w-full gap-4", defaultClassNames.month),
        nav: cn(
          "flex items-center gap-2 w-full absolute top-0 inset-x-0 justify-between px-2",
          defaultClassNames.nav
        ),
        button_previous: cn(
          "h-8 w-8 p-0 select-none rounded-full bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl border border-glass-border dark:border-glass-border-dark text-black dark:text-white hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-200 aria-disabled:opacity-50 flex items-center justify-center",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          "h-8 w-8 p-0 select-none rounded-full bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl border border-glass-border dark:border-glass-border-dark text-black dark:text-white hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-200 aria-disabled:opacity-50 flex items-center justify-center",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex items-center justify-center h-10 w-full px-8",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "w-full flex items-center text-sm font-medium justify-center h-10 gap-3 px-2",
          defaultClassNames.dropdowns
        ),
        caption_label: cn(
          "select-none font-medium text-sm",
          captionLayout === "label"
            ? "text-sm"
            : "hidden", // Hide the label when using dropdowns
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse mt-4",
        weekdays: cn("flex w-full", defaultClassNames.weekdays),
        weekday: cn(
          "text-black/60 dark:text-white/60 rounded-md flex-1 font-medium text-xs uppercase tracking-wide text-center py-2 select-none min-w-[36px]",
          defaultClassNames.weekday
        ),
        week: cn("flex w-full mt-1", defaultClassNames.week),
        week_number_header: cn(
          "select-none w-9",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-xs select-none text-black/60 dark:text-white/60 w-9 text-center",
          defaultClassNames.week_number
        ),
        day: cn(
          "relative w-full h-full p-0 text-center group/day aspect-square select-none flex-1 min-w-[36px]",
          defaultClassNames.day
        ),
        range_start: cn(
          "rounded-l-md bg-accent",
          defaultClassNames.range_start
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("rounded-r-md bg-accent", defaultClassNames.range_end),
        today: cn(
          "bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl border border-glass-border dark:border-glass-border-dark text-primary-500 font-semibold rounded-md data-[selected=true]:rounded-none",
          defaultClassNames.today
        ),
        outside: cn(
          "text-black/30 dark:text-white/30 aria-selected:text-black/30 dark:aria-selected:text-white/30",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-black/30 dark:text-white/30 opacity-50 cursor-not-allowed",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <IconChevronLeft className={cn("h-4 w-4", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <IconChevronRight
                className={cn("h-4 w-4", className)}
                {...props}
              />
            )
          }

          return (
            <IconChevronDown className={cn("h-4 w-4", className)} {...props} />
          )
        },
        MonthsDropdown: ({ value, onChange, options }) => {
          const [open, setOpen] = React.useState(false)
          const selectedOption = options?.find(opt => opt.value === value)
          
          return (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-[110px] h-8 justify-between font-normal bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl border border-glass-border dark:border-glass-border-dark text-black dark:text-white hover:bg-white/20 dark:hover:bg-white/10"
                >
                  {selectedOption?.label || "Month"}
                  <IconChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[110px] p-0 bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl border border-glass-border dark:border-glass-border-dark shadow-2xl shadow-black/10 dark:shadow-black/40" align="start">
                <div className="max-h-[200px] overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {options?.map((option, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start font-normal px-3 py-2 rounded-none text-black dark:text-white hover:bg-white/20 dark:hover:bg-white/10"
                      onClick={() => {
                        const event = { target: { value: option.value.toString() } } as React.ChangeEvent<HTMLSelectElement>
                        onChange?.(event)
                        setOpen(false)
                      }}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )
        },
        YearsDropdown: ({ value, onChange, options }) => {
          const [open, setOpen] = React.useState(false)
          const selectedOption = options?.find(opt => opt.value === value)
          
          return (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-[80px] h-8 justify-between font-normal bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl border border-glass-border dark:border-glass-border-dark text-black dark:text-white hover:bg-white/20 dark:hover:bg-white/10"
                >
                  {selectedOption?.label || "Year"}
                  <IconChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[80px] p-0 bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl border border-glass-border dark:border-glass-border-dark shadow-2xl shadow-black/10 dark:shadow-black/40" align="start">
                <div className="max-h-[200px] overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {options?.map((option, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start font-normal px-3 py-2 rounded-none text-black dark:text-white hover:bg-white/20 dark:hover:bg-white/10"
                      onClick={() => {
                        const event = { target: { value: option.value.toString() } } as React.ChangeEvent<HTMLSelectElement>
                        onChange?.(event)
                        setOpen(false)
                      }}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex h-9 w-9 items-center justify-center text-center text-xs text-black/60 dark:text-white/60">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="sm"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "h-9 w-9 p-0 font-normal text-sm transition-all duration-200 rounded-md text-black dark:text-white hover:bg-glassmorphism dark:hover:bg-glassmorphism-dark hover:backdrop-blur-xl hover:border hover:border-glass-border dark:hover:border-glass-border-dark",
        "data-[selected-single=true]:bg-primary-500 data-[selected-single=true]:text-white data-[selected-single=true]:shadow-lg data-[selected-single=true]:shadow-primary-500/25 data-[selected-single=true]:hover:bg-primary-600",
        "data-[range-middle=true]:bg-glassmorphism dark:data-[range-middle=true]:bg-glassmorphism-dark data-[range-middle=true]:backdrop-blur-xl data-[range-middle=true]:border data-[range-middle=true]:border-glass-border dark:data-[range-middle=true]:border-glass-border-dark data-[range-middle=true]:rounded-none",
        "data-[range-start=true]:bg-primary-500 data-[range-start=true]:text-white data-[range-start=true]:shadow-lg data-[range-start=true]:shadow-primary-500/25 data-[range-start=true]:rounded-r-none",
        "data-[range-end=true]:bg-primary-500 data-[range-end=true]:text-white data-[range-end=true]:shadow-lg data-[range-end=true]:shadow-primary-500/25 data-[range-end=true]:rounded-l-none",
        modifiers.today && "bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl border border-glass-border dark:border-glass-border-dark text-primary-500 font-semibold shadow-lg shadow-primary-500/10",
        modifiers.outside && "text-black/30 dark:text-white/30 opacity-50",
        modifiers.disabled && "text-black/30 dark:text-white/30 opacity-30 cursor-not-allowed",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
