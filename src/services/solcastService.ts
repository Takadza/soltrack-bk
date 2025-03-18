import axios from 'axios'



const SOLCAST_API_URL = 'https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLitBRWyaFUUcB_Wb9-ULmR7JFG3HlkuHfo0zIh66wtkafCUHQOXVK7kceGb2Ob6bjauedEeMiOthYNvRaqFV2OFv5yxxN_5R4-SOe80_ofHmCnYDU0mSw34O14HoFMr4ui2d3Ycvj17dZpmiBcbc75KH7HCGCanS6Qv8uIvDbAMS_Wa3OXOlxtG2Q9-RXwiDICg2oMdjJOjqEQETurAWZsPHRZ74ErFZNktS7kpL5nJ5DVMnckpFYQO67pB40F1VUHTu2l-ktFlBisBVJf-7ofSkc3CWS6jLTOTD6hOzRrBz_k370NvyDVytNsxsA&lib=MR_mt8Wmapn2W5zwbI-xTtMWO3py5UuMP';

export const fetchSolcastData = async () => {
    try {
        console.info('Fetching data from Solcast API...');
        const response = await axios.get(SOLCAST_API_URL);
        console.info('Data fetched successfully from Solcast API');
        return response.data;
    } catch (error) {
        console.error('Error fetching data from Solcast API:', error);
        throw error;
    }
};