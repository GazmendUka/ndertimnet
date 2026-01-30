// ------------------------------------------------------------
// src/components/leads/LeadUnlockPanel.jsx
// ------------------------------------------------------------
import React, { useState } from "react";
import axios from "../../api/axios"; // justera om din axios ligger annorlunda

export default function LeadUnlockPanel({ lead, refreshLead }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!lead) return null;

  const {
    can_chat,
    customer_info_unlocked,
    customer_info_unlocked_by_company,
  } = lead;

  // ------------------------------------------------------------
  // POST HELPERS
  // ------------------------------------------------------------
  const postAction = async (url) => {
    try {
      setLoading(true);
      setError("");
      await axios.post(url);
      await refreshLead(); // uppdatera leadet i parent-komponenten
    } catch (err) {
      setError("Något gick fel. Försök igen.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const unlockChat = () =>
    postAction(`/leads/leadmatches/${lead.id}/unlock_chat/`);

  const unlockCustomerInfo = () =>
    postAction(`/leads/leadmatches/${lead.id}/unlock_customer_info/`);

  // ------------------------------------------------------------
  // UI STATE LOGIC
  // ------------------------------------------------------------

  // 1️⃣ Om allt är upplåst → visa inget
  if (can_chat && customer_info_unlocked) {
    return null;
  }

  return (
    <div
      style={{
        padding: "16px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        background: "#fafafa",
        marginBottom: "16px",
      }}
    >
      <h3 style={{ marginBottom: "12px", fontWeight: "bold" }}>
        Lead-lås & upplåsning
      </h3>

      {error && (
        <div
          style={{
            padding: "8px",
            background: "#ffe0e0",
            color: "#900",
            borderRadius: "6px",
            marginBottom: "12px",
          }}
        >
          {error}
        </div>
      )}

      {/* --------------------------------------------------------
          🔐 CHAT UNLOCK (15€)
      -------------------------------------------------------- */}
      {!can_chat && (
        <div style={{ marginBottom: "16px" }}>
          <p>Chatten är låst. Betala <strong>15€</strong> för att starta chat.</p>

          <button
            onClick={unlockChat}
            disabled={loading}
            style={{
              marginTop: "8px",
              padding: "10px 16px",
              borderRadius: "6px",
              background: loading ? "#bbb" : "#007bff",
              color: "#fff",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Bearbetar..." : "Lås upp chat – 15€"}
          </button>
        </div>
      )}

      {/* --------------------------------------------------------
          🔓 CUSTOMER INFO UNLOCK (5€)
      -------------------------------------------------------- */}
      {!customer_info_unlocked && (
        <div>
          <p>
            Kundens kontaktuppgifter är låsta.  
            Betala <strong>5€</strong> för att visa dem direkt.
          </p>

          <button
            onClick={unlockCustomerInfo}
            disabled={loading}
            style={{
              marginTop: "8px",
              padding: "10px 16px",
              borderRadius: "6px",
              background: loading ? "#bbb" : "#28a745",
              color: "#fff",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Bearbetar..." : "Lås upp kundinfo – 5€"}
          </button>
        </div>
      )}

      {/* Badge om företaget redan gjort premium unlock */}
      {customer_info_unlocked_by_company && (
        <p style={{ marginTop: "12px", color: "#28a745" }}>
          ✔ Du har köpt Premium Unlock.
        </p>
      )}
    </div>
  );
}
