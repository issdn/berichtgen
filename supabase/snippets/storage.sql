INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'templates',
    'templates',
    true,
    10485760,
    ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);