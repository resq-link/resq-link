import React, { memo } from "react";
import PremiumIncidentCard from "./PremiumIncidentCard";

function ActiveIncidentCard({ report, onPress }) {
  return (
    <PremiumIncidentCard
      report={report}
      onPress={onPress}
      featured
    />
  );
}

export default memo(ActiveIncidentCard);
