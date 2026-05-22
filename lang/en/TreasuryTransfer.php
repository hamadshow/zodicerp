<?php

return [
    'title' => 'Treasury Transfer',
    'subtitle' => 'Manage and transfer funds between treasuries and cash accounts',
    'reference_number' => 'Reference Number',
    'from_treasury' => 'From Treasury',
    'to_treasury' => 'To Treasury',
    'amount' => 'Amount',
    'date' => 'Date',
    'status' => 'Status',
    'notes' => 'Notes',
    'created_by' => 'Created By',
    'actions' => 'Actions',
    'new_transfer' => 'New Transfer',
    'details' => 'Transfer Details',
    
    'statuses' => [
        'pending' => 'Pending',
        'approved' => 'Approved',
        'rejected' => 'Rejected',
        'completed' => 'Completed',
    ],
    
    'validation' => [
        'different_treasuries' => 'The source and destination treasuries must be different',
        'amount_min' => 'The amount must be greater than zero',
    ],
    
    'errors' => [
        'same_treasury' => 'Cannot transfer to the same treasury',
        'insufficient_balance' => 'Insufficient balance in the source treasury',
        'invalid_status_for_approval' => 'Current status does not allow approval',
    ],
    
    'messages' => [
        'created' => 'Transfer request created successfully',
        'approved' => 'Transfer approved and balances updated',
        'rejected' => 'Transfer request rejected',
    ],
    
    'approve' => 'Approve',
    'reject' => 'Reject',
    'rejection_reason' => 'Rejection Reason',
];
