<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Http\Requests\Accounting\StopAccountRequest;
use App\Http\Requests\Accounting\StoreAccountRequest;
use App\Http\Requests\Accounting\UpdateAccountRequest;
use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AccountsController extends Controller
{
    public function index(Request $request)
    {
        $query = Account::query();

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();

            $query->where(function ($q) use ($search) {
                $q->where('AccName', 'like', '%' . $search . '%')
                    ->orWhere('AccCode', 'like', '%' . $search . '%')
                    ->orWhere('AccNote', 'like', '%' . $search . '%');
            });
        }

        if ($request->filled('type')) {
            $query->where('AccType', (int) $request->input('type'));
        }

        if ($request->filled('branch')) {
            $query->where('AccBranch', (int) $request->input('branch'));
        }

        if ($request->filled('ids')) {
            $ids = $request->input('ids');
            if (is_string($ids)) {
                $ids = array_filter(explode(',', $ids));
            }
            $ids = array_map('intval', (array) $ids);
            if (!empty($ids)) {
                $query->orWhereIn('AccID', $ids);
            }
        }

        if ($request->boolean('postable_only')) {
            $query->where('AccStopped', 0);
            $query->where('AccFinal', 1);
            $query->select(['AccID', 'AccCode', 'AccName']);
        }

        $accounts = $query->orderBy('AccCode')->get();

        return response()->json($accounts);
    }

    public function tree(Request $request)
    {
        $query = Account::query();

        if ($request->filled('branch')) {
            $query->where('AccBranch', (int) $request->input('branch'));
        }

        $accounts = $query->orderBy('AccCode')->get();

        $byParent = [];
        foreach ($accounts as $account) {
            $parentKey = $account->AccParent ?: null;
            if (!array_key_exists($parentKey, $byParent)) {
                $byParent[$parentKey] = [];
            }
            $byParent[$parentKey][] = $account;
        }

        $buildTree = function ($parentKey) use (&$buildTree, $byParent) {
            $children = $byParent[$parentKey] ?? [];

            return array_map(function (Account $account) use (&$buildTree, $byParent) {
                return [
                    'AccID' => $account->AccID,
                    'AccCode' => $account->AccCode,
                    'AccName' => $account->AccName,
                    'AccType' => $account->AccType,
                    'AccParent' => $account->AccParent,
                    'Nature' => $account->Nature,
                    'AccDmType' => (int) $account->AccType === 1 ? $account->AccDmType : null,
                    'AccFinal' => $account->AccFinal,
                    'AccMaxLimt' => $account->AccMaxLimt,
                    'AccMaxDuration' => $account->AccMaxDuration,
                    'AccBranch' => $account->AccBranch,
                    'AccStopped' => $account->AccStopped,
                    'AccNote' => $account->AccNote,
                    'children' => $buildTree($account->AccCode),
                ];
            }, $children);
        };

        $tree = $buildTree(null);

        return response()->json($tree);
    }

    public function show(Account $account)
    {
        return response()->json($account);
    }

    public function store(StoreAccountRequest $request)
    {
        $payload = $request->validated();

        $account = DB::transaction(function () use ($payload) {
            $data = $payload;
            $data['AccStopped'] = (bool) ($data['AccStopped'] ?? false);
            $data['AddUser'] = Auth::id();
            $data['AddDate'] = now()->toDateString();
            $data['NumOfEdit'] = 0;

            return Account::create($data);
        });

        return response()->json([
            'success' => true,
            'message' => 'Account created successfully.',
            'account' => $account,
        ]);
    }

    public function update(UpdateAccountRequest $request, Account $account)
    {
        $payload = $request->validated();

        $account = DB::transaction(function () use ($payload, $account) {
            $data = $payload;
            $data['AccStopped'] = (bool) ($data['AccStopped'] ?? false);
            $data['EditUser'] = Auth::id();
            $data['EditDate'] = now()->toDateString();
            $data['NumOfEdit'] = (int) ($account->NumOfEdit ?? 0) + 1;

            $account->update($data);

            return $account->fresh();
        });

        return response()->json([
            'success' => true,
            'message' => 'Account updated successfully.',
            'account' => $account,
        ]);
    }

    public function destroy(Account $account)
    {
        $hasChildren = Account::where('AccParent', $account->AccCode)->exists();
        if ($hasChildren) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete an account that has child accounts.',
            ], 422);
        }

        if (Schema::hasTable('tblqaidbody')) {
            $hasEntries = DB::table('tblqaidbody')
                ->whereIn('QaidBodyAccID', [$account->AccID, $account->AccCode])
                ->exists();

            if ($hasEntries) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete an account that is referenced in journal entries.',
                ], 422);
            }
        }

        DB::transaction(function () use ($account) {
            $account->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Account deleted successfully.',
        ]);
    }

    public function stop(StopAccountRequest $request, Account $account)
    {
        $account = DB::transaction(function () use ($account) {
            $account->AccStopped = true;
            $account->EditUser = Auth::id();
            $account->EditDate = now()->toDateString();
            $account->NumOfEdit = (int) ($account->NumOfEdit ?? 0) + 1;
            $account->save();

            return $account->fresh();
        });

        return response()->json([
            'success' => true,
            'message' => 'Account has been stopped.',
            'account' => $account,
        ]);
    }
}
