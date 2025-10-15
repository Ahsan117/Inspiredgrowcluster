import React, { useState } from "react";
import axios from "axios";
import { set } from "lodash";
export default function AuditAuditors({ auditors: initialAuditors, onClose,id }) {
  const [auditors, setAuditors] = useState(initialAuditors || []);
  const [showModal, setShowModal] = useState(false);
  const [newAuditor, setNewAuditor] = useState("");
  const[password,setPassword]=useState("");
  const handleAddAuditor =async () => {
    if (!newAuditor.trim()) return;
   try {
    await axios.post("api/audit/auditor/create",{
     auditId: id,
     username: newAuditor,
     password: password
    },
  {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  })
  setAuditors((prev) => [...prev, { username: newAuditor }]);
   } catch (error) {
      console.error("Error adding auditor:", error);
   }
    setShowModal(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-md p-6 bg-white shadow-lg rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Auditors in Audit</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
          >
            ✕
          </button>
        </div>

        {/* Auditor List */}
        <ul className="mb-4 divide-y divide-gray-200">
          {auditors.length ? (
            auditors.map((a) => (
              <li key={a._id} className="flex items-center justify-between py-2">
                <span>{a.username}</span>
              </li>
            ))
          ) : (
            <p className="text-sm text-gray-500">No auditors yet</p>
          )}
        </ul>

        {/* Add Button */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Add Auditor
        </button>
      </div>

      {/* Add Auditor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="p-6 bg-white shadow-lg rounded-2xl w-80">
            <h3 className="mb-3 text-lg font-semibold">Add New Auditor</h3>
            <input
              type="text"
              value={newAuditor}
              onChange={(e) => setNewAuditor(e.target.value)}
              placeholder="Enter auditor name"
              className="w-full px-3 py-2 mb-4 border rounded-lg"
            />
             <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter auditor password"
              className="w-full px-3 py-2 mb-4 border rounded-lg"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAuditor}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
