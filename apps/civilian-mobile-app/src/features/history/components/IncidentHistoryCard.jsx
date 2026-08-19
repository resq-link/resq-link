import React, { memo } from "react";
import PremiumIncidentCard from "./PremiumIncidentCard";

function IncidentHistoryCard({ report, onPress }) {
  return (
    <PremiumIncidentCard
      report={report}
      onPress={onPress}
      featured={false}
    />
  );
}

export default memo(IncidentHistoryCard);
