import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getLead,
  updateLeadStatus,
  markLeadWon,
  markLeadLost,
} from "../data/leadStore";

import { getActiveSalesPersons } from "../data/salesPersonStore";
import { getServices } from "../data/serviceStore";
import { getLeadFollowUps } from "../data/followUpStore";

import { getClientById } from "../data/clientStore";

export default function LeadDetails() {
  const { leadId } = useParams();
  const navigate = useNavigate();

  const [refresh, setRefresh] = useState(0);

  const [salesPersons, setSalesPersons] = useState<
    Awaited<ReturnType<typeof getActiveSalesPersons>>
  >([]);

  const lead = leadId ? getLead(leadId) : null;

  useEffect(() => {
    let mounted = true;

    async function loadSalesPersons() {
      try {
        const persons = await getActiveSalesPersons();

        if (!mounted) return;

        setSalesPersons(persons);
      } catch (error) {
        console.error("Failed to load sales persons:", error);

        if (mounted) {
          setSalesPersons([]);
        }
      }
    }

    loadSalesPersons();

    return () => {
      mounted = false;
    };
  }, []);

  if (!lead) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-800">
            Lead not found
          </h2>

          <button
            onClick={() => navigate("/leads")}
            className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Back to Leads
          </button>
        </div>
      </div>
    );
  }

  const salesPerson = salesPersons.find(
    (person) => person.id === lead.assignedTo,
  );

  const services = getServices();

  const service = services.find((item) => item.id === lead.interestedService);

  const followUps = getLeadFollowUps(lead.id);

  /*
   * Check whether this Lead has already been converted.
   */
  const convertedClient = lead.convertedClientId
    ? getClientById(lead.convertedClientId)
    : undefined;

  const handleStatusChange = (
    status:
      | "New"
      | "Contacted"
      | "Follow-up"
      | "Quotation Sent"
      | "Negotiation"
      | "Won"
      | "Lost",
  ) => {
    updateLeadStatus(lead.id, status);
    setRefresh((value) => value + 1);
  };

  const handleWon = () => {
    markLeadWon(lead.id);
    setRefresh((value) => value + 1);
  };

  const handleLost = () => {
    const reason = window.prompt("Enter lost reason:");

    if (reason === null) return;

    markLeadLost(lead.id, reason);
    setRefresh((value) => value + 1);
  };

  const handleConvertToClient = () => {
    navigate(`/add-client?leadId=${encodeURIComponent(lead.id)}`);
  };

  /*
   * Create quotation directly from this Lead.
   *
   * Lead does NOT need to be converted into Client first.
   * AddQuotation will use the leadId to pre-fill Lead-related data.
   */
  const handleCreateQuotation = () => {
    navigate(`/add-quotation?leadId=${encodeURIComponent(lead.id)}`);
  };

  void refresh;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <button
            onClick={() => navigate("/leads")}
            className="mb-3 text-sm text-gray-500 hover:text-gray-800"
          >
            ← Back to Leads
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {lead.companyName || lead.contactPerson}
            </h1>

            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                lead.status === "Won"
                  ? "bg-green-100 text-green-700"
                  : lead.status === "Lost"
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-100 text-blue-700"
              }`}
            >
              {lead.status}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                lead.priority === "High"
                  ? "bg-red-100 text-red-700"
                  : lead.priority === "Medium"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-600"
              }`}
            >
              {lead.priority} Priority
            </span>
          </div>

          <p className="mt-1 text-sm text-gray-500">Lead ID: {lead.id}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate(`/leads/${lead.id}/edit`)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit Lead
          </button>

          {lead.status !== "Lost" && (
            <button
              onClick={handleCreateQuotation}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              + Create Quotation
            </button>
          )}

          {lead.status !== "Won" && (
            <button
              onClick={handleWon}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Mark Won
            </button>
          )}

          {lead.status !== "Lost" && (
            <button
              onClick={handleLost}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Mark Lost
            </button>
          )}
        </div>
      </div>

      {/* Conversion */}
      {lead.status === "Won" && (
        <section className="rounded-xl border border-green-200 bg-green-50 p-5">
          {convertedClient ? (
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-green-800">
                  Lead converted to Client
                </p>

                <p className="mt-1 text-sm text-green-700">
                  Client:{" "}
                  {convertedClient.company || convertedClient.contactPerson}
                </p>

                <p className="mt-1 text-xs text-green-600">
                  Client ID: {convertedClient.id}
                </p>
              </div>

              <button
                onClick={() => navigate(`/clients/${convertedClient.id}`)}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                View Client
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-green-800">Deal Won</p>

                <p className="mt-1 text-sm text-green-700">
                  This lead is won but has not been converted into a client yet.
                </p>
              </div>

              <button
                onClick={handleConvertToClient}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Convert to Client
              </button>
            </div>
          )}
        </section>
      )}

      {/* Status */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-gray-900">
          Lead Status
        </h2>

        <div className="flex flex-wrap gap-2">
          {[
            "New",
            "Contacted",
            "Follow-up",
            "Quotation Sent",
            "Negotiation",
            "Won",
            "Lost",
          ].map((status) => (
            <button
              key={status}
              onClick={() =>
                handleStatusChange(
                  status as
                    | "New"
                    | "Contacted"
                    | "Follow-up"
                    | "Quotation Sent"
                    | "Negotiation"
                    | "Won"
                    | "Lost",
                )
              }
              className={`rounded-lg border px-3 py-2 text-sm transition ${
                lead.status === status
                  ? "border-green-600 bg-green-50 font-medium text-green-700"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </section>

      {/* Basic Information */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-5 text-base font-semibold text-gray-900">
          Basic Information
        </h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Company" value={lead.companyName} />
          <InfoItem label="Contact Person" value={lead.contactPerson} />
          <InfoItem label="Phone" value={lead.phone} />
          <InfoItem label="Email" value={lead.email} />
          <InfoItem label="Address" value={lead.address} />
          <InfoItem label="Lead Source" value={lead.leadSource} />
          <InfoItem label="Source Details" value={lead.sourceDetails} />

          <InfoItem
            label="Sales Person"
            value={salesPerson?.name || lead.assignedTo}
          />

          <InfoItem
            label="Interested Service"
            value={
              service?.service_name ||
              service?.serviceName ||
              lead.interestedService
            }
          />

          <InfoItem
            label="Follow-up Assigned To"
            value={lead.followUpAssignedTo}
          />
        </div>
      </section>

      {/* Requirement */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-gray-900">
          Requirement
        </h2>

        <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
          {lead.requirement || "No requirement added."}
        </div>
      </section>

      {/* Commercial */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-5 text-base font-semibold text-gray-900">
          Commercial
        </h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          <InfoItem
            label="Expected Value"
            value={`₹${Number(lead.expectedValue || 0).toLocaleString(
              "en-IN",
            )}`}
          />

          <InfoItem
            label="Expected Closing"
            value={lead.expectedClosingDate || "-"}
          />

          <InfoItem
            label="Commission"
            value={
              lead.commissionApplicable
                ? `${lead.commissionPercent}%`
                : "Not Applicable"
            }
          />

          <InfoItem
            label="Expected Commission"
            value={
              lead.commissionApplicable
                ? `₹${Number(lead.commissionAmount || 0).toLocaleString(
                    "en-IN",
                  )}`
                : "₹0"
            }
          />

          <InfoItem label="Commission Status" value={lead.commissionStatus} />

          {lead.commissionPaidDate && (
            <InfoItem
              label="Commission Paid Date"
              value={lead.commissionPaidDate}
            />
          )}
        </div>
      </section>

      {/* Reference */}
      {(lead.referencePersonName ||
        lead.referencePersonPhone ||
        lead.referencePersonEmail) && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-5 text-base font-semibold text-gray-900">
            Reference / Referral
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <InfoItem
              label="Reference Person"
              value={lead.referencePersonName}
            />

            <InfoItem label="Phone" value={lead.referencePersonPhone} />

            <InfoItem label="Email" value={lead.referencePersonEmail} />
          </div>
        </section>
      )}

      {/* Follow-up */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Follow-up</h2>

          <button
            onClick={() =>
              navigate(
                `/add-follow-up?relatedType=Lead&relatedId=${encodeURIComponent(
                  lead.id,
                )}`,
              )
            }
            className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            + Add Follow-up
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <InfoItem
            label="Next Follow-up"
            value={
              lead.nextFollowUpDate
                ? `${lead.nextFollowUpDate} ${lead.nextFollowUpTime || ""}`
                : "-"
            }
          />

          <InfoItem label="Next Action" value={lead.nextAction} />

          <InfoItem label="Total Follow-ups" value={String(followUps.length)} />
        </div>

        {followUps.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500">
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Purpose</th>
                  <th className="px-3 py-3">Assigned To</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {followUps.map((followUp) => (
                  <tr key={followUp.id} className="border-b border-gray-100">
                    <td className="px-3 py-3">
                      {followUp.followUpDate}
                      {followUp.followUpTime ? ` ${followUp.followUpTime}` : ""}
                    </td>

                    <td className="px-3 py-3">{followUp.purpose || "-"}</td>

                    <td className="px-3 py-3">{followUp.assignedTo || "-"}</td>

                    <td className="px-3 py-3">{followUp.status}</td>

                    <td className="px-3 py-3">
                      <button
                        onClick={() => navigate(`/follow-ups/${followUp.id}`)}
                        className="text-green-600 hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Notes */}
      {(lead.notes || lead.internalNotes) && (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {lead.notes && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-4 text-base font-semibold text-gray-900">
                Notes
              </h2>

              <p className="whitespace-pre-wrap text-sm text-gray-700">
                {lead.notes}
              </p>
            </div>
          )}

          {lead.internalNotes && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-4 text-base font-semibold text-gray-900">
                Internal Notes
              </h2>

              <p className="whitespace-pre-wrap text-sm text-gray-700">
                {lead.internalNotes}
              </p>
            </div>
          )}
        </section>
      )}

      {/* Lost Reason */}
      {lead.lostReason && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h2 className="mb-2 text-base font-semibold text-red-800">
            Lost Reason
          </h2>

          <p className="text-sm text-red-700">{lead.lostReason}</p>
        </section>
      )}

      {/* Meta */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <InfoItem label="Created At" value={lead.createdAt} />

          <InfoItem label="Updated At" value={lead.updatedAt || "-"} />

          <InfoItem label="Converted At" value={lead.convertedAt || "-"} />

          <InfoItem
            label="Converted Client"
            value={lead.convertedClientId || "-"}
          />
        </div>
      </section>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value?: string | number;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-gray-400">{label}</p>

      <p className="text-sm font-medium text-gray-800">
        {value !== undefined && value !== "" ? value : "-"}
      </p>
    </div>
  );
}
