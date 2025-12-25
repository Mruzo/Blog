/**
 * Simple API Test Script
 * Tests if the API endpoints are working correctly
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/icvybz';

async function testAPI() {
  console.log('🧪 Testing API Endpoints');
  console.log('========================');
  
  try {
    // Test 1: Check if API is reachable
    console.log('\n1. Testing API connectivity...');
    const response = await axios.get(`${API_BASE_URL}/stories/`, {
      headers: {
        'Authorization': 'Token 8fbc920c12fc42fec5012417bc51225445460acc'
      }
    });
    console.log('✅ API is reachable');
    const stories = response.data.results || response.data;
    console.log('📊 Stories count:', stories.length || 0);
    console.log('📋 Available story IDs:', stories.map(s => s.id).slice(0, 10));
    
    // Test 2: Check specific story (using first available ID)
    const firstStoryId = stories[0].id;
    console.log(`\n2. Testing specific story (ID: ${firstStoryId})...`);
    try {
      const storyResponse = await axios.get(`${API_BASE_URL}/stories/${firstStoryId}/`, {
        headers: {
          'Authorization': 'Token 8fbc920c12fc42fec5012417bc51225445460acc'
        }
      });
      console.log(`✅ Story ${firstStoryId} found:`, storyResponse.data.title);
    } catch (err) {
      console.log(`❌ Story ${firstStoryId} not found:`, err.response && err.response.status, err.response && err.response.statusText);
    }
    
    // Test 3: Check characters for the first story
    console.log(`\n3. Testing characters for story ${firstStoryId}...`);
    try {
      const charactersResponse = await axios.get(`${API_BASE_URL}/stories/${firstStoryId}/characters/`, {
        headers: {
          'Authorization': 'Token 8fbc920c12fc42fec5012417bc51225445460acc'
        }
      });
      console.log('✅ Characters found:', (charactersResponse.data.results && charactersResponse.data.results.length) || (charactersResponse.data.length) || 0);
    } catch (err) {
      console.log('❌ Characters not found:', err.response && err.response.status, err.response && err.response.statusText);
    }
    
    // Test 4: Check seasons for the first story
    console.log(`\n4. Testing seasons for story ${firstStoryId}...`);
    try {
      const seasonsResponse = await axios.get(`${API_BASE_URL}/stories/${firstStoryId}/seasons/`, {
        headers: {
          'Authorization': 'Token 8fbc920c12fc42fec5012417bc51225445460acc'
        }
      });
      console.log('✅ Seasons found:', (seasonsResponse.data.results && seasonsResponse.data.results.length) || (seasonsResponse.data.length) || 0);
    } catch (err) {
      console.log('❌ Seasons not found:', err.response && err.response.status, err.response && err.response.statusText);
    }
    
  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testAPI();
