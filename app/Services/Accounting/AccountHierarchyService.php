<?php

namespace App\Services\Accounting;

use App\Models\Account;
use Illuminate\Support\Facades\DB;
use Exception;

class AccountHierarchyService
{
    /**
     * Generate the next available child code for a given parent.
     * Pattern: Root (1 digit), Children append 2 digits.
     */
    public function generateChildCode(?string $parentCode): string
    {
        return DB::transaction(function () use ($parentCode) {
            if (!$parentCode || $parentCode == '0') {
                // Generate Level 1 (Root) code: 1, 2, 3...
                $maxRoot = Account::whereRaw('LENGTH(AccCode) = 1')
                    ->lockForUpdate()
                    ->max('AccCode');
                
                return (string) ($maxRoot ? (int)$maxRoot + 1 : 1);
            }

            // Generate Level 2+ code: ParentCode + 2 digits (01, 02...)
            $parentLength = strlen($parentCode);
            $childLength = $parentLength + 2;

            $maxChild = Account::where('AccParent', $parentCode)
                ->whereRaw("LENGTH(AccCode) = ?", [$childLength])
                ->lockForUpdate()
                ->max('AccCode');

            if (!$maxChild) {
                return $parentCode . '01';
            }

            $lastTwoDigits = (int) substr((string)$maxChild, -2);
            if ($lastTwoDigits >= 99) {
                throw new Exception("Maximum children limit (99) reached for parent code $parentCode.");
            }

            $nextTwoDigits = str_pad($lastTwoDigits + 1, 2, '0', STR_PAD_LEFT);
            return $parentCode . $nextTwoDigits;
        });
    }

    /**
     * Inherit properties from parent to child.
     */
    public function inheritParentProperties(Account $child, Account $parent): void
    {
        $child->AccDmType = $parent->AccDmType;
        $child->AccFinal = $parent->AccFinal;
    }

    /**
     * Synchronize properties and optionally update codes to all descendants recursively.
     */
    public function syncDescendants(Account $account, bool $updateCodes = false, ?string $oldCode = null): void
    {
        // Use a chunked approach for performance if there are many descendants
        Account::where('AccCode', 'like', ($oldCode ?? $account->AccCode) . '%')
            ->where('AccID', '!=', $account->AccID)
            ->chunkById(100, function ($descendants) use ($account, $updateCodes, $oldCode) {
                foreach ($descendants as $descendant) {
                    $updateData = [
                        'AccDmType' => $account->AccDmType,
                        'AccFinal' => $account->AccFinal,
                    ];

                    if ($updateCodes && $oldCode) {
                        // Replace the old parent prefix with the new parent prefix
                        $newChildCode = $account->AccCode . substr((string)$descendant->AccCode, strlen($oldCode));
                        $updateData['AccCode'] = $newChildCode;
                        
                        // Also update the parent code reference for direct children
                        if ((string)$descendant->AccParent === $oldCode) {
                            $updateData['AccParent'] = $account->AccCode;
                        } else {
                            // For grandchildren, we need to update their AccParent too
                            $newParentCode = $account->AccCode . substr((string)$descendant->AccParent, strlen($oldCode));
                            $updateData['AccParent'] = $newParentCode;
                        }
                    }

                    Account::where('AccID', $descendant->AccID)->update($updateData);
                }
            }, 'AccID');
    }

    /**
     * Update parent's AccFinal status based on children count.
     */
    public function updateParentFinalStatus(string $parentCode): void
    {
        if (!$parentCode || $parentCode == '0') {
            return;
        }

        $parent = Account::where('AccCode', $parentCode)->first();
        if (!$parent) {
            return;
        }

        $hasChildren = Account::where('AccParent', $parentCode)->exists();
        
        // Leaf account: AccFinal = 1, Non-leaf account: AccFinal = 0
        $newStatus = $hasChildren ? 0 : 1;

        if ($parent->AccFinal != $newStatus) {
            $parent->AccFinal = $newStatus;
            $parent->save();
        }
    }

    /**
     * Validate hierarchy rules.
     */
    public function validateHierarchy(Account $account, ?string $newParentCode): void
    {
        if (!$newParentCode || $newParentCode == '0') {
            return;
        }

        // 2. Self-parent
        if ($newParentCode == $account->AccCode) {
            throw new Exception("An account cannot be its own parent.");
        }

        $parent = Account::where('AccCode', $newParentCode)->first();
        
        // 4. Parent not found
        if (!$parent) {
            throw new Exception("Parent account code $newParentCode does not exist.");
        }

        // 5. Parent stopped
        if ($parent->AccStopped) {
            throw new Exception("Cannot create or move an account under a stopped parent.");
        }

        // 6. Moving account under its own descendant (Circular hierarchy check)
        if ($this->isDescendantOf($parent, $account)) {
            throw new Exception("An account cannot be moved under one of its own descendants.");
        }
    }

    /**
     * Get all descendants of an account.
     */
    public function getDescendants(Account $account)
    {
        return Account::where('AccCode', 'like', $account->AccCode . '%')
            ->where('AccID', '!=', $account->AccID)
            ->get();
    }

    /**
     * Check if $account is a descendant of $potentialAncestor.
     */
    public function isDescendantOf(Account $account, Account $potentialAncestor): bool
    {
        return str_starts_with((string)$account->AccCode, (string)$potentialAncestor->AccCode) 
               && $account->AccCode != $potentialAncestor->AccCode;
    }
}
