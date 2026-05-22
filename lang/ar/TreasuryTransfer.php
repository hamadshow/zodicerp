<?php

return [
    'title' => 'تحويل بين الخزائن',
    'subtitle' => 'إدارة وتحويل الأموال بين الخزائن والحسابات النقدية',
    'reference_number' => 'رقم المرجع',
    'from_treasury' => 'من خزانة',
    'to_treasury' => 'إلى خزانة',
    'amount' => 'المبلغ',
    'date' => 'التاريخ',
    'status' => 'الحالة',
    'notes' => 'ملاحظات',
    'created_by' => 'أنشئ بواسطة',
    'actions' => 'العمليات',
    'new_transfer' => 'تحويل جديد',
    'details' => 'تفاصيل التحويل',
    
    'statuses' => [
        'pending' => 'قيد الانتظار',
        'approved' => 'تمت الموافقة',
        'rejected' => 'مرفوض',
        'completed' => 'مكتمل',
    ],
    
    'validation' => [
        'different_treasuries' => 'يجب اختيار خزينة مختلفة للتحويل إليها',
        'amount_min' => 'يجب أن يكون المبلغ أكبر من صفر',
    ],
    
    'errors' => [
        'same_treasury' => 'لا يمكن التحويل لنفس الخزينة',
        'insufficient_balance' => 'رصيد الخزينة المصدر غير كافٍ',
        'invalid_status_for_approval' => 'حالة التحويل لا تسمح بالموافقة عليه',
    ],
    
    'messages' => [
        'created' => 'تم إنشاء طلب التحويل بنجاح',
        'approved' => 'تمت الموافقة على التحويل وتحديث الأرصدة',
        'rejected' => 'تم رفض طلب التحويل',
    ],
    
    'approve' => 'موافقة',
    'reject' => 'رفض',
    'rejection_reason' => 'سبب الرفض',
];
