import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Fornecedor {
  id: string;
  nome: string;
}

interface Props {
  fornecedores: Fornecedor[];
  selected: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}

export function MultiSelectFornecedores({
  fornecedores,
  selected,
  onChange,
  placeholder = 'Vincular fornecedores',
}: Props) {
  const [open, setOpen] = useState(false);

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else onChange([...selected, id]);
  };

  const selectedItems = fornecedores.filter((f) => selected.includes(f.id));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal"
          >
            {selected.length > 0
              ? `${selected.length} fornecedor(es) vinculado(s)`
              : <span className="text-muted-foreground">{placeholder}</span>}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar fornecedor..." />
            <CommandList>
              <CommandEmpty>Nenhum fornecedor cadastrado.</CommandEmpty>
              <CommandGroup>
                {fornecedores.map((f) => (
                  <CommandItem key={f.id} value={f.nome} onSelect={() => toggle(f.id)}>
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selected.includes(f.id) ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {f.nome}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedItems.map((f) => (
            <Badge key={f.id} variant="secondary" className="gap-1 pr-1">
              {f.nome}
              <button
                type="button"
                onClick={() => toggle(f.id)}
                className="rounded-sm hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}