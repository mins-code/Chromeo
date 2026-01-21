import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as PartnerService from '../services/partnerService';
import { Partner } from '../types';

export function usePartners() {
    const { session } = useAuth();
    const [partner, setPartner] = useState<Partner | null>(null);
    const [hasConnectedPartners, setHasConnectedPartners] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const checkPartners = async () => {
            if (session?.user) {
                try {
                    const partnerships = await PartnerService.getPartnerships();
                    
                    if (!mounted) return;

                    const acceptedPartners = partnerships.filter(p => p.status === 'accepted');
                    setHasConnectedPartners(acceptedPartners.length > 0);
                    
                    if (acceptedPartners.length > 0) {
                        const firstPartner = acceptedPartners[0];
                        setPartner({
                            id: firstPartner.partnerId,
                            name: firstPartner.partnerName || firstPartner.partnerEmail,
                            email: firstPartner.partnerEmail,
                            isConnected: true
                        });
                    } else {
                        setPartner(null);
                    }
                } catch (error) {
                    console.error('Failed to check partners', error);
                } finally {
                    if (mounted) setIsLoading(false);
                }
            } else {
                if (mounted) setIsLoading(false);
            }
        };

        checkPartners();

        return () => {
            mounted = false;
        };
    }, [session]);

    return {
        partner,
        hasConnectedPartners,
        isLoading
    };
}
