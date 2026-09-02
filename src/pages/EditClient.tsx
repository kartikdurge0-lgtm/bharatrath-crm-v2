import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getClientById, updateClient, type Client } from "../data/clientStore";

export default function EditClient() {
  const navigate = useNavigate();
  const { clientId } = useParams();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    const existingClient = getClientById(clientId);

    if (existingClient) {
      setClient(existingClient);
    }

    setLoading(false);
  }, [clientId]);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Loading client...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Client Not Found</h2>

          <p className="mt-1 text-sm text-gray-500">
            The requested client could not be found.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/clients")}
          className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
        >
          Back to Clients
        </button>
      </div>
    );
  }

  const handleChange = (field: keyof Client, value: string) => {
    setClient((current) => {
      if (!current) return current;

      return {
        ...current,
        [field]: value,
      };
    });
  };

  const handleSave = () => {
    if (!client.company.trim()) {
      alert("Company name is required.");
      return;
    }

    if (!client.contactPerson.trim()) {
      alert("Contact person is required.");
      return;
    }

    if (!client.phone.trim()) {
      alert("Mobile number is required.");
      return;
    }

    updateClient(client);

    navigate(`/clients/${client.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Edit Client</h2>

          <p className="mt-1 text-sm text-gray-500">
            Update client information
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/clients/${client.id}`)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Back to Client
        </button>
      </div>

      {/* Form Card */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Card Header */}
        <div className="border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">
            Client Information
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Update the client's details below.
          </p>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
          {/* Company Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Company Name <span className="text-red-500">*</span>
            </label>

            <input
              type="text"
              value={client.company}
              onChange={(e) => handleChange("company", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Contact Person */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Contact Person <span className="text-red-500">*</span>
            </label>

            <input
              type="text"
              value={client.contactPerson}
              onChange={(e) => handleChange("contactPerson", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Mobile */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Mobile Number <span className="text-red-500">*</span>
            </label>

            <input
              type="text"
              value={client.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Email
            </label>

            <input
              type="email"
              value={client.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Address */}
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Address
            </label>

            <textarea
              rows={3}
              value={client.address}
              onChange={(e) => handleChange("address", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* GST */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              GST Number
            </label>

            <input
              type="text"
              value={client.gst}
              onChange={(e) =>
                handleChange("gst", e.target.value.toUpperCase())
              }
              placeholder="ENTER GST NUMBER"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm uppercase outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Status */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Status
            </label>

            <select
              value={client.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            >
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Services */}
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Services
            </label>

            <input
              type="text"
              value={client.services}
              onChange={(e) => handleChange("services", e.target.value)}
              placeholder="Example: Website + Hosting"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={() => navigate(`/clients/${client.id}`)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
