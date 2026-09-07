import { useEffect, useMemo, useRef, useState } from "react";

export type SearchableClient = {
  id: string | number;
  company?: string;
  companyName?: string;
  company_name?: string;
  name?: string;
  contactPerson?: string;
  contact_person?: string;
  phone?: string;
  mobile?: string;
  archived?: boolean;
};

type Props = {
  clients: SearchableClient[];
  value: string;
  onChange: (clientId: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

function getClientCompany(client: SearchableClient): string {
  return (
    client.company ||
    client.companyName ||
    client.company_name ||
    client.name ||
    ""
  );
}

function getClientContact(client: SearchableClient): string {
  return client.contactPerson || client.contact_person || "";
}

function getClientPhone(client: SearchableClient): string {
  return client.phone || client.mobile || "";
}

export default function SearchableClientSelect({
  clients,
  value,
  onChange,
  placeholder = "Select client",
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedClient = clients.find(
    (client) => String(client.id) === String(value),
  );

  const selectedName = selectedClient ? getClientCompany(selectedClient) : "";

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return clients;
    }

    return clients.filter((client) => {
      const company = getClientCompany(client).toLowerCase();
      const contact = getClientContact(client).toLowerCase();
      const phone = getClientPhone(client).toLowerCase();
      const id = String(client.id).toLowerCase();

      return (
        company.includes(query) ||
        contact.includes(query) ||
        phone.includes(query) ||
        id.includes(query)
      );
    });
  }, [clients, search]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const handleSelect = (clientId: string) => {
    onChange(clientId);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
          setSearch("");
        }}
        className="flex min-h-[46px] w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-left text-sm text-slate-900 outline-none transition hover:border-slate-400 focus:border-green-600 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-slate-50"
      >
        <span className={selectedName ? "text-slate-900" : "text-slate-500"}>
          {selectedName || placeholder}
        </span>

        <span className="ml-3 text-xs text-slate-500">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-200 bg-white p-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </span>

              <input
                autoFocus
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search client..."
                className="w-full rounded-md border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filteredClients.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                No clients found.
              </div>
            ) : (
              filteredClients.map((client) => {
                const company = getClientCompany(client);
                const contact = getClientContact(client);
                const phone = getClientPhone(client);
                const isSelected = String(client.id) === String(value);

                return (
                  <button
                    type="button"
                    key={String(client.id)}
                    onClick={() => handleSelect(String(client.id))}
                    className={`block w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-green-50 ${
                      isSelected ? "bg-green-50" : "bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {company || "Unnamed Client"}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          {contact || phone || String(client.id)}
                        </p>
                      </div>

                      <span className="shrink-0 text-xs text-slate-400">
                        {client.id}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
