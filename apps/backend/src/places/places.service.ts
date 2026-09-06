// ========== Imports: ==========
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlaceSuggestionDto } from './dto/place-suggestion.dto';
import { PlaceDetailsDto } from './dto/place-details.dto';

interface GeoapifyAutocompleteResult {
    place_id: string;
    formatted: string;
}

interface GeoapifyAutocompleteResponse {
    results: GeoapifyAutocompleteResult[];
}

interface GeoapifyPlaceDetailsProperties {
    formatted?: string;
    lat?: number;
    lon?: number;
}

interface GeoapifyPlaceDetailsResponse {
    features: { properties: GeoapifyPlaceDetailsProperties }[];
}

@Injectable()
export class PlacesService {
    constructor(private readonly configService: ConfigService) {}

    async autocomplete(input: string): Promise<PlaceSuggestionDto[]> {
        const apiKey = this.configService.get<string>('geoapify.apiKey');
        const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(input)}&format=json&apiKey=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json() as GeoapifyAutocompleteResponse;

        return data.results.map((result) => ({
            placeId: result.place_id,
            description: result.formatted,
        }));
    }

    async getDetails(placeId: string): Promise<PlaceDetailsDto> {
        const apiKey = this.configService.get<string>('geoapify.apiKey');
        const url = `https://api.geoapify.com/v2/place-details?id=${encodeURIComponent(placeId)}&apiKey=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json() as GeoapifyPlaceDetailsResponse;

        const properties = data.features[0]?.properties;
        if (!properties?.formatted || properties.lat === undefined || properties.lon === undefined) {
            throw new BadRequestException('Kon nie ‘n geldige adres vir hierdie plek vind nie');
        }

        return {
            placeId,
            address: properties.formatted,
            lat: properties.lat,
            lon: properties.lon,
        };
    }
}
