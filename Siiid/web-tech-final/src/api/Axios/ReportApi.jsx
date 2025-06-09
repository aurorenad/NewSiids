
import caseApi from './caseApi';

export const ReportApi = {
    submitReport: (formData) => {
        return caseApi.post('/api/reports', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

};
