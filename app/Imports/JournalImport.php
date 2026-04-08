<?php

namespace App\Imports;

use App\Services\Accounting\JournalImportService;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Illuminate\Contracts\Queue\ShouldQueue;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterImport;
use Illuminate\Support\Facades\Log;

/**
 * Enhanced Excel Import for Journal Entries.
 * Using Collection to handle cross-row grouping via JournalImportService.
 */
class JournalImport implements ToCollection, WithHeadingRow, WithChunkReading, ShouldQueue, WithEvents
{
    protected JournalImportService $importService;

    public function __construct()
    {
        $this->importService = new JournalImportService();
    }

    /**
     * Process each chunk of the Excel file.
     * 
     * @param Collection $rows
     */
    public function collection(Collection $rows)
    {
        // Convert to array and pass to service
        $this->importService->importRows($rows->toArray());
    }

    /**
     * Efficiently read the file in chunks.
     */
    public function chunkSize(): int
    {
        return 1000; // Increased for better performance with 10k+ rows
    }

    /**
     * Define events for the import process.
     */
    public function registerEvents(): array
    {
        return [
            AfterImport::class => function(AfterImport $event) {
                Log::info("Journal Import Completed successfully.");
            },
        ];
    }
}
