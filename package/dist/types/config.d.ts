export type Region = 'global' | 'china';
export type OutputFormat = 'json' | 'text' | 'table';
export interface ZaiConfig {
    api_key?: string;
    region: Region;
    base_url: string;
    default_chat_model: string;
    default_multimodal_model: string;
    default_image_model: string;
    default_video_model: string;
    default_audio_model: string;
    default_ocr_model: string;
    default_web_search_engine: string;
    timeout: number;
    output_format: OutputFormat;
}
export type ConfigKey = keyof ZaiConfig;
