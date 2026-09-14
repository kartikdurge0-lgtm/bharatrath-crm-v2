import { useEffect, useMemo, useRef, useState } from "react";

export type SearchableClient = {
  id: string | number;

  // Preferred stable CRM identifier
  crm_client_id?: string | null;

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

/**
 * Returns the stable CRM identifier when available.
 * Falls back to the component's existing id.
 */
function getClientKey(client: SearchableClient): string {
  const crmId = client.crm_client_id?.trim();

  if (crmId) {
    return crmId;
  }

  return String(client.id);
}

/**
 * Removes duplicate clients before rendering.
 *
 * Priority:
 * 1. crm_client_id
 * 2. id
 *
 * The first occurrence is retained.
 */
function deduplicateClients(clients: SearchableClient[]): SearchableClient[] {
  const seen = new Set<string>();
  const uniqueClients: SearchableClient[] = [];

  for (const client of clients) {
    const key = getClientKey(client);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueClients.push(client);
  }

  return uniqueClients;
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

  /**
   * Deduplicate the incoming client list.
   *
   * This protects the UI even if duplicate records
   * accidentally come from Supabase or another source.
   */
  const uniqueClients = useMemo(() => {
    return deduplicateClients(clients);
  }, [clients]);

  /**
   * Find the currently selected client.
   *
   * Existing callers normally pass the client's id.
   * We also support crm_client_id for safer matching.
   */
  const selectedClient = useMemo(() => {
    const normalizedValue = String(value);

    return (
      uniqueClients.find((client) => String(client.id) === normalizedValue) ||
      uniqueClients.find(
        (client) => getClientKey(client) === normalizedValue,
      ) ||
      null
    );
  }, [uniqueClients, value]);

  const selectedName = selectedClient ? getClientCompany(selectedClient) : "";

  /**
   * Filter after deduplication.
   *
   * Search supports:
   * - Company
   * - Contact person
   * - Phone
   * - Client ID
   * - CRM Client ID
   */
  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return uniqueClients;
    }

    return uniqueClients.filter((client) => {
      const company = getClientCompany(client).toLowerCase();
      const contact = getClientContact(client).toLowerCase();
      const phone = getClientPhone(client).toLowerCase();

      const id = String(client.id).toLowerCase();

      const crmId = String(client.crm_client_id || "").toLowerCase();

      return (
        company.includes(query) ||
        contact.includes(query) ||
        phone.includes(query) ||
        id.includes(query) ||
        crmId.includes(query)
      );
    });
  }, [uniqueClients, search]);

  /**
   * Close dropdown when clicking outside.
   */
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
          if (disabled) {
            return;
          }

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
          {/* Search */}
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

          {/* Client list */}
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

                const clientId = String(client.id);
                const stableKey = getClientKey(client);

                const isSelected =
                  String(client.id) === String(value) ||
                  stableKey === String(value);

                return (
                  <button
                    type="button"
                    key={stableKey}
                    onClick={() => handleSelect(clientId)}
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
                          {contact || phone || client.crm_client_id || clientId}
                        </p>
                      </div>

                      <span className="shrink-0 text-xs text-slate-400">
                        {client.crm_client_id || clientId}
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
