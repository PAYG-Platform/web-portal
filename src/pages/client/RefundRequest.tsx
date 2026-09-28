import React from 'react';
import { Navigate } from 'react-router-dom';

export const RefundRequest = () => <Navigate to="/client/history?tab=refunds" replace />;
export default RefundRequest;
