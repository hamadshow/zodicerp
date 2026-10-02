<?php

namespace Tests\Feature;

use App\Models\Accounting\JournalEntry;
use App\Support\JournalStatus;
use Tests\TestCase;

class JournalStatusNormalizationTest extends TestCase
{
    public function test_status_values_normalize_to_canonical_application_values(): void
    {
        $this->assertSame('Post', JournalStatus::normalize('post'));
        $this->assertSame('Post', JournalStatus::normalize('Posted'));
        $this->assertSame('Post', JournalStatus::normalize('posted'));
        $this->assertSame('UnPost', JournalStatus::normalize('unpost'));
        $this->assertSame('UnPost', JournalStatus::normalize('UnPost'));
        $this->assertSame('UnPost', JournalStatus::normalize('Unposted'));
        $this->assertSame('UnPost', JournalStatus::normalize('unposted'));
        $this->assertSame('UnPost', JournalStatus::normalize(''));
    }

    public function test_legacy_status_literals_still_count_as_posted_or_unposted(): void
    {
        $this->assertTrue(JournalStatus::isPosted('Post'));
        $this->assertTrue(JournalStatus::isPosted('posted'));
        $this->assertTrue(JournalStatus::isPosted('Posted'));
        $this->assertTrue(JournalEntry::isPostedStatus('posted'));

        $this->assertTrue(JournalStatus::isUnposted('UnPost'));
        $this->assertTrue(JournalStatus::isUnposted('unposted'));
        $this->assertTrue(JournalStatus::isUnposted('Unposted'));

        $this->assertFalse(JournalStatus::isPosted('UnPost'));
        $this->assertFalse(JournalStatus::isPosted('Unposted'));
        $this->assertFalse(JournalStatus::isUnposted('Post'));
    }
}
