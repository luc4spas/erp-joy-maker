import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Tabela onde as categorias são persistidas (deve ter colunas id e nome). */
  table?: 'categorias_pagar' | 'suprimentos_categorias';
}

export function CategoriaCombobox({
  value,
  onChange,
  placeholder = 'Selecione a categoria',
  table = 'categorias_pagar',
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<{ id: string; nome: string }[]>([]);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const { data } = await supabase.from(table).select('id, nome').order('nome');
    setItems(((data as any) ?? []).map((x: any) => ({ id: x.id, nome: x.nome })));
  };

  useEffect(() => {
    load();
  }, [table]);

  const exists = items.some((i) => i.nome.toLowerCase() === search.trim().toLowerCase());
  const showCreate = search.trim().length > 0 && !exists;

  const handleCreate = async () => {
    const nome = search.trim();
    if (!nome) return;
    setCreating(true);
    const { data, error } = await supabase
      .from(table)
      .insert({ nome })
      .select()
      .single();
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((prev) => [...prev, { id: data.id, nome: data.nome }].sort((a, b) => a.nome.localeCompare(b.nome)));
    onChange(data.nome);
    setSearch('');
    setOpen(false);
    toast.success('Categoria criada');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value || <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput
            placeholder="Buscar ou criar..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty className="py-2 px-2 text-sm">
              {showCreate ? null : 'Nenhuma categoria encontrada.'}
            </CommandEmpty>
            <CommandGroup>
              {items.map((it) => (
                <CommandItem
                  key={it.id}
                  value={it.nome}
                  onSelect={() => {
                    onChange(it.nome);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === it.nome ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {it.nome}
                </CommandItem>
              ))}
              {showCreate && (
                <CommandItem
                  onSelect={handleCreate}
                  className="text-primary cursor-pointer"
                  value={`__create__${search}`}
                >
                  {creating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Criar nova categoria "{search.trim()}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}