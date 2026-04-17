<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Service to handle AI communications with DeepSeek/OpenAI.
 */
class AIService
{
    protected ?string $apiKey;
    protected ?string $baseUrl;
    protected ?string $model;

    protected string $lastError = '';

    public function __construct()
    {
        $this->apiKey = config('services.openai.key') ?? env('OPENAI_API_KEY');
        $this->baseUrl = config('services.openai.base_url') ?? env('OPENAI_BASE_URL', 'https://api.openai.com/v1');
        $this->model = config('services.openai.model') ?? env('OPENAI_MODEL', 'deepseek-chat');
    }

    /**
     * Get the last error message from the AI service.
     */
    public function getLastError(): string
    {
        return $this->lastError;
    }

    /**
     * Send a completion request to the AI.
     *
     * @param string $prompt
     * @param string $systemPrompt
     * @return string|null
     */
    public function ask(string $prompt, string $systemPrompt = 'You are a helpful assistant.'): ?string
    {
        try {
            if (empty($this->apiKey)) {
                $this->lastError = 'AI API Key is not configured.';
                return null;
            }
            $this->lastError = '';
            $response = Http::withHeaders([
                'Authorization' => "Bearer {$this->apiKey}",
            ])->post(rtrim($this->baseUrl, '/') . '/chat/completions', [
                'model' => $this->model,
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => $prompt],
                ],
                'temperature' => 0.7,
            ]);

            if ($response->successful()) {
                return $response->json('choices.0.message.content');
            }

            $errorData = $response->json('error') ?? [];
            $this->lastError = $errorData['message'] ?? $response->body() ?? 'Unknown AI Service Error';
            
            Log::error('AI Service Error: ' . $this->lastError);
            return null;
        } catch (\Exception $e) {
            $this->lastError = $e->getMessage();
            Log::error('AI Service Exception: ' . $this->lastError);
            return null;
        }
    }

    /**
     * Specifically for translations.
     */
    public function translate(string $text, string $targetLocale): ?string
    {
        $systemPrompt = "You are a professional translator for an ERP system. Translate the given text into {$targetLocale}. Maintain the technical meaning and context of business, accounting, and inventory management. Only provide the translated text without any extra comments.";
        return $this->ask($text, $systemPrompt);
    }
}
