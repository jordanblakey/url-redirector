import { test, expect, describe, beforeEach, afterEach, vi } from 'vitest';
import { getAccessToken, getStoreListing, uploadExtension, publishExtension, updateStoreListing } from '../../../scripts/cws-utils';
import fs from 'fs-extra';

// Mock global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Mock fs
vi.mock('fs-extra');

describe('cws-utils', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getAccessToken', () => {
        test('should return access token on success', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => ({ access_token: 'fake_token' }),
            });

            const token = await getAccessToken('id', 'secret', 'refresh', fetchMock);
            expect(token).toBe('fake_token');
            expect(fetchMock).toHaveBeenCalledWith('https://oauth2.googleapis.com/token', expect.objectContaining({
                method: 'POST',
            }));
        });

        test('should throw error on failure', async () => {
            fetchMock.mockResolvedValue({
                ok: false,
                status: 400,
                text: async () => 'Bad Request',
            });

            await expect(getAccessToken('id', 'secret', 'refresh', fetchMock))
                .rejects.toThrow('Failed to get access token: 400 Bad Request');
        });
    });

    describe('getStoreListing', () => {
        test('should return listing data on success', async () => {
            const mockData = { items: [{ fullDescription: 'desc' }] };
            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => mockData,
            });

            const data = await getStoreListing('token', 'ext_id', fetchMock);
            expect(data).toEqual(mockData);
            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining('/items/ext_id/listings'),
                expect.objectContaining({ method: 'GET' })
            );
        });
    });

    describe('uploadExtension', () => {
        test('should upload file on success', async () => {
            // Mock fs.createReadStream
            const mockStream = { pipe: vi.fn() } as unknown as fs.ReadStream;
            vi.mocked(fs.createReadStream).mockReturnValue(mockStream);

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => ({ uploadState: 'SUCCESS' }),
            });

            const result = await uploadExtension('token', 'ext_id', 'path/to/zip', fetchMock, fs);
            expect(result).toEqual({ uploadState: 'SUCCESS' });
            expect(fs.createReadStream).toHaveBeenCalledWith('path/to/zip');
            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining('/upload/chromewebstore/v1.1/items/ext_id'),
                expect.objectContaining({ method: 'PUT' })
            );
        });
    });

    describe('publishExtension', () => {
        test('should publish on success', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => ({ status: 'OK' }),
            });

            const result = await publishExtension('token', 'ext_id', fetchMock);
            expect(result).toEqual({ status: 'OK' });
            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining('/publish'),
                expect.objectContaining({ method: 'POST' })
            );
        });
    });

    describe('updateStoreListing', () => {
        test('should update listing on success', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => ({ kind: 'chromewebstore#item' }),
            });

            const result = await updateStoreListing('token', 'ext_id', 'desc', 'promo', fetchMock);
            expect(result).toEqual({ kind: 'chromewebstore#item' });
            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining('/listings/en-US'),
                expect.objectContaining({ 
                    method: 'PUT',
                    body: JSON.stringify({ fullDescription: 'desc', promotionalText: 'promo' })
                })
            );
        });
    });
});
