import { http, HttpResponse } from 'msw';

export const handlers = [
    http.get('/api/alarmas', async () => {
        const response = await fetch('/Alarms.geojson');
        const data = await response.json() as Record<string, unknown>;
        return HttpResponse.json(data);
    }),
];
