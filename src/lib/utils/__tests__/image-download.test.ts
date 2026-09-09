import { downloadImageToLocal } from '../image-download';

describe('downloadImageToLocal', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches the original image URL without a third-party proxy', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await downloadImageToLocal('https://example.com/bean.jpg');

    expect(result).toBeNull();
    const requestedUrls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(requestedUrls).toEqual(['https://example.com/bean.jpg']);
    expect(requestedUrls.some((url) => url.includes('allorigins'))).toBe(false);
  });
});
