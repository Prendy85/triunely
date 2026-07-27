// src/hooks/useCommercial.js

import { useContext } from "react";

import { CommercialContext } from "../context/CommercialProvider";

export default function useCommercial() {
  const context = useContext(CommercialContext);

  if (!context) {
    throw new Error(
      "useCommercial must be used within a CommercialProvider."
    );
  }

  return context;
}

export { useCommercial };
