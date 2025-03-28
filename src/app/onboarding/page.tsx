'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface FormData {
  neighborhoodName: string;
  address: string;
  city: string;
  state: string;
  interests: string[];
  communityType: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    neighborhoodName: '',
    address: '',
    city: '',
    state: '',
    interests: [],
    communityType: 'residential'
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }

      // Check if user has already completed onboarding
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (profile) {
        // User has already completed onboarding, redirect to dashboard
        router.push('/dashboard');
      }
    };

    checkAuth();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      console.log('Saving profile with data:', {
        user_id: user.id,
        neighborhood_name: formData.neighborhoodName,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        interests: formData.interests,
        community_type: formData.communityType,
      });

      // Save user profile data to Supabase
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          neighborhood_name: formData.neighborhoodName,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          interests: formData.interests,
          community_type: formData.communityType,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error('Profile error:', profileError);
        throw profileError;
      }

      // Create or update neighborhood
      const { error: neighborhoodError } = await supabase
        .from('neighborhoods')
        .upsert({
          user_id: user.id,
          name: formData.neighborhoodName,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (neighborhoodError) {
        console.error('Neighborhood error:', neighborhoodError);
        throw neighborhoodError;
      }

      console.log('Successfully saved data, redirecting to dashboard...');
      router.push('/dashboard');
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error saving profile:', error);
        setError(error.message || 'An error occurred while saving your profile');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Welcome to your neighborhood
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {"Let's get to know your community better"}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            {step === 1 && (
              <div>
                <label htmlFor="neighborhoodName" className="block text-sm font-medium text-gray-700">
                  Neighborhood Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="neighborhoodName"
                    id="neighborhoodName"
                    required
                    value={formData.neighborhoodName}
                    onChange={handleInputChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    Street Address
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="address"
                      id="address"
                      required
                      value={formData.address}
                      onChange={handleInputChange}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                      City
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="city"
                        id="city"
                        required
                        value={formData.city}
                        onChange={handleInputChange}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                      State
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="state"
                        id="state"
                        required
                        value={formData.state}
                        onChange={handleInputChange}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="communityType" className="block text-sm font-medium text-gray-700">
                    Community Type
                  </label>
                  <select
                    name="communityType"
                    id="communityType"
                    required
                    value={formData.communityType}
                    onChange={handleInputChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="residential">Residential</option>
                    <option value="mixed">Mixed Use</option>
                    <option value="commercial">Commercial</option>
                    <option value="rural">Rural</option>
                  </select>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Select Your Interests
                </label>
                <div className="space-y-2">
                  {['Events', 'Safety', 'Environment', 'Education', 'Sports', 'Arts', 'Food', 'Business'].map((interest) => (
                    <label key={interest} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.interests.includes(interest.toLowerCase())}
                        onChange={() => handleInterestToggle(interest.toLowerCase())}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">{interest}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : step === 3 ? 'Complete' : 'Next'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 