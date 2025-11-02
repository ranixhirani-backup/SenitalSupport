interface KPICardsProps {
  alertsInQueue: number;
  disputesOpened: number;
}

export default function KPICards({ alertsInQueue, disputesOpened }: KPICardsProps) {
  const cards = [
    { label: "Alerts in Queue", value: alertsInQueue },
    { label: "Disputes Opened", value: disputesOpened },
  ];

  return (
    <div style={{ display: "flex", gap: "1rem" }}>
      {cards.map((card) => (
        <div
          key={card.label}
          style={{
            flex: 1,
            background: "#1e1e1e",
            color: "white",
            padding: "1rem",
            borderRadius: "0.75rem",
            textAlign: "center",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          }}
        >
          <h3 style={{ fontSize: "1rem", opacity: 0.8 }}>{card.label}</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
