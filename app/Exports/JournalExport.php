<?php

namespace App\Exports;

use App\Models\Accounting\JournalEntry;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Illuminate\Contracts\Queue\ShouldQueue;
use Maatwebsite\Excel\Concerns\Exportable;

class JournalExport implements FromQuery, WithMapping, WithHeadings, WithChunkReading, ShouldQueue
{
    use Exportable;

    /**
    * @return \Illuminate\Database\Eloquent\Builder
    */
    public function query()
    {
        return JournalEntry::with('lines')->orderBy('date', 'desc');
    }

    /**
    * @var JournalEntry $journal
    */
    public function map($journal): array
    {
        $rows = [];
        foreach ($journal->lines as $line) {
            $rows[] = [
                $journal->entry_code,
                $journal->entry_type,
                $journal->date->format('Y-m-d'),
                $journal->reference,
                $journal->description,
                $line->account_id,
                $line->debit,
                $line->credit,
                $line->description,
                $line->cost_center_code,
                $journal->status,
            ];
        }
        return $rows;
    }

    public function headings(): array
    {
        return [
            'entry_code',
            'entry_type',
            'date',
            'reference',
            'header_description',
            'account_id',
            'debit',
            'credit',
            'line_description',
            'cost_center_code',
            'status',
        ];
    }

    public function chunkSize(): int
    {
        return 1000;
    }
}
