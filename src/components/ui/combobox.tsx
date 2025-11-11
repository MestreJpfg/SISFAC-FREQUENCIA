
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  notFoundText?: string;
}

export function Combobox({ options, value, onChange, placeholder, notFoundText }: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  
  const handleSelect = (currentValue: string) => {
    onChange(currentValue === value ? "" : currentValue)
    setInputValue("")
    setOpen(false)
  }

  const handleCreate = () => {
    if (inputValue && !options.find(option => option.label.toLowerCase() === inputValue.toLowerCase())) {
        onChange(inputValue);
    }
    setInputValue("")
    setOpen(false);
  }

  const currentLabel = options.find((option) => option.value.toLowerCase() === value?.toLowerCase())?.label

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value
            ? currentLabel || value
            : placeholder || "Selecione uma opção..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput 
            placeholder={placeholder || "Buscar ou criar novo..."}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
                <button
                    type="button"
                    onClick={handleCreate}
                    className="flex items-center justify-center p-2 text-sm text-muted-foreground w-full"
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Criar "{inputValue}"
                </button>
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.toLowerCase() === option.value.toLowerCase() ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
