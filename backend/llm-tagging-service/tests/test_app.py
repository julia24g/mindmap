import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app, suggest_tags, fetch_tags_from_graphql, TagInput

client = TestClient(app)

# Test data
sample_event = TagInput(
    title="Machine Learning Conference 2024",
    description="A conference about the latest developments in AI and machine learning"
)

sample_existing_tags = ["machine-learning", "ai", "conference", "technology", "data-science"]

class TestTagInput:
    """Test the TagInput model validation"""
    
    def test_valid_tag_input(self):
        """Test that valid TagInput is accepted"""
        event = TagInput(title="Test Title", description="Test Description")
        assert event.title == "Test Title"
        assert event.description == "Test Description"
    
    def test_empty_title(self):
        """Test that empty title raises validation error"""
        with pytest.raises(ValueError):
            TagInput(title="", description="Test Description")
    
    def test_empty_description(self):
        """Test that empty description is allowed"""
        event = TagInput(title="Test Title", description="")
        assert event.title == "Test Title"
        assert event.description == ""
    
    def test_missing_description(self):
        """Test that missing description uses default empty string"""
        event = TagInput(title="Test Title")  # Missing description field
        assert event.title == "Test Title"
        assert event.description == ""  # Should use default value
    
    def test_missing_title(self):
        """Test that missing title raises validation error"""
        with pytest.raises(ValueError):
            TagInput(description="Test Description")  # Missing title field

class TestFetchTagsFromGraphQL:
    """Test the GraphQL tag fetching functionality"""
    
    @patch('main.client.execute')
    def test_fetch_tags_success(self, mock_execute):
        """Test successful tag fetching from GraphQL"""
        mock_execute.return_value = {"allTags": ["tag1", "tag2", "tag3"]}
        
        result = fetch_tags_from_graphql()
        
        assert result == ["tag1", "tag2", "tag3"]
        mock_execute.assert_called_once()
    
    @patch('main.client.execute')
    def test_fetch_tags_with_limit(self, mock_execute):
        """Test tag fetching with custom limit"""
        mock_execute.return_value = {"allTags": ["tag1"]}
        
        result = fetch_tags_from_graphql(limit=1)
        
        assert result == ["tag1"]
        # Verify the limit parameter was passed correctly
        call_args = mock_execute.call_args
        assert call_args[1]['variable_values']['limit'] == 1
    
    @patch('main.client.execute')
    def test_fetch_tags_graphql_error(self, mock_execute):
        """Test handling of GraphQL errors"""
        mock_execute.side_effect = Exception("GraphQL connection failed")
        
        with pytest.raises(Exception):
            fetch_tags_from_graphql()

class TestSuggestTags:
    """Test the tag suggestion logic"""
    
    @patch('main.tagger')
    def test_suggest_tags_success(self, mock_tagger):
        """Test successful tag suggestion"""
        mock_tagger.return_value = [{"generated_text": "Tags: machine-learning, ai, conference"}]
        
        result = suggest_tags("ML conference", sample_existing_tags)
        
        assert result == ["machine-learning", "ai", "conference"]
        mock_tagger.assert_called_once()
    
    @patch('main.tagger')
    def test_suggest_tags_with_existing_tags(self, mock_tagger):
        """Test that existing tags are preferred when relevant"""
        mock_tagger.return_value = [{"generated_text": "Tags: machine-learning, ai"}]
        
        result = suggest_tags("AI conference", sample_existing_tags)
        
        # Should prefer existing tags when they match
        assert "ai" in result or "machine-learning" in result
    
    @patch('main.tagger')
    def test_suggest_tags_empty_response(self, mock_tagger):
        """Test handling of empty LLM response"""
        mock_tagger.return_value = [{"generated_text": "Tags:"}]
        
        result = suggest_tags("Test event", sample_existing_tags)
        
        assert result == []
    
    @patch('main.tagger')
    def test_suggest_tags_llm_error(self, mock_tagger):
        """Test handling of LLM pipeline errors"""
        mock_tagger.side_effect = Exception("LLM service unavailable")
        
        with pytest.raises(Exception):
            suggest_tags("Test event", sample_existing_tags)

class TestSuggestTagsEndpoint:
    """Test the /suggest-tags API endpoint"""
    
    @patch('main.fetch_tags_from_graphql')
    @patch('main.suggest_tags')
    def test_suggest_tags_endpoint_success(self, mock_suggest_tags, mock_fetch_tags):
        """Test successful API call"""
        mock_fetch_tags.return_value = sample_existing_tags
        mock_suggest_tags.return_value = ["machine-learning", "ai"]
        
        response = client.post("/suggest-tags", json=sample_event.dict())
        
        assert response.status_code == 200
        assert response.json() == {"suggested_tags": ["machine-learning", "ai"]}
    
    @patch('main.fetch_tags_from_graphql')
    @patch('main.suggest_tags')
    def test_suggest_tags_endpoint_empty_description(self, mock_suggest_tags, mock_fetch_tags):
        """Test API call with empty description"""
        mock_fetch_tags.return_value = sample_existing_tags
        mock_suggest_tags.return_value = ["machine-learning"]
        
        event_with_empty_desc = TagInput(
            title="Machine Learning Conference 2024",
            description=""
        )
        
        response = client.post("/suggest-tags", json=event_with_empty_desc.dict())
        
        assert response.status_code == 200
        assert response.json() == {"suggested_tags": ["machine-learning"]}
    
    @patch('main.fetch_tags_from_graphql')
    def test_suggest_tags_endpoint_graphql_error(self, mock_fetch_tags):
        """Test API error handling when GraphQL fails"""
        mock_fetch_tags.side_effect = Exception("GraphQL error")
        
        response = client.post("/suggest-tags", json=sample_event.dict())
        
        assert response.status_code == 500
        assert "GraphQL error" in response.json()["detail"]
    
    @patch('main.fetch_tags_from_graphql')
    @patch('main.suggest_tags')
    def test_suggest_tags_endpoint_llm_error(self, mock_suggest_tags, mock_fetch_tags):
        """Test API error handling when LLM fails"""
        mock_fetch_tags.return_value = sample_existing_tags
        mock_suggest_tags.side_effect = Exception("LLM error")
        
        response = client.post("/suggest-tags", json=sample_event.dict())
        
        assert response.status_code == 500
        assert "LLM error" in response.json()["detail"]
    
    def test_suggest_tags_endpoint_invalid_input(self):
        """Test API validation of input data"""
        invalid_data = {"title": "", "description": "Test"}  # Invalid: empty title
        
        response = client.post("/suggest-tags", json=invalid_data)
        
        assert response.status_code == 422  # Validation error
    
    def test_suggest_tags_endpoint_missing_fields(self):
        """Test API handling of missing required fields"""
        invalid_data = {}  # Missing title (required field)
        
        response = client.post("/suggest-tags", json=invalid_data)
        
        assert response.status_code == 422  # Validation error

class TestDuplicateContentHandling:
    """Test the specific case mentioned in the comment about duplicate content"""
    
    @patch('main.fetch_tags_from_graphql')
    @patch('main.suggest_tags')
    def test_duplicate_content_consistency(self, mock_suggest_tags, mock_fetch_tags):
        """Test that the same content produces consistent tag suggestions"""
        mock_fetch_tags.return_value = sample_existing_tags
        mock_suggest_tags.return_value = ["machine-learning", "ai"]
        
        # First call
        response1 = client.post("/suggest-tags", json=sample_event.dict())
        assert response1.status_code == 200
        
        # Second call with same content
        response2 = client.post("/suggest-tags", json=sample_event.dict())
        assert response2.status_code == 200
        
        # Both should return the same suggestions (given same LLM response)
        assert response1.json() == response2.json()
        
        # Verify suggest_tags was called twice with same parameters
        assert mock_suggest_tags.call_count == 2
        # Both calls should have the same arguments
        assert mock_suggest_tags.call_args_list[0] == mock_suggest_tags.call_args_list[1]

class TestIntegration:
    """Integration tests that test the full flow"""
    
    @patch('main.client.execute')
    @patch('main.tagger')
    def test_full_integration_success(self, mock_tagger, mock_execute):
        """Test the complete flow from API call to response"""
        # Mock GraphQL response
        mock_execute.return_value = {"allTags": ["existing-tag"]}
        # Mock LLM response
        mock_tagger.return_value = [{"generated_text": "Tags: existing-tag, new-tag"}]
        
        response = client.post("/suggest-tags", json=sample_event.dict())
        
        assert response.status_code == 200
        result = response.json()
        assert "suggested_tags" in result
        assert len(result["suggested_tags"]) > 0

# Performance and stress tests
class TestPerformance:
    """Test performance characteristics"""
    
    @patch('main.fetch_tags_from_graphql')
    @patch('main.suggest_tags')
    def test_large_existing_tags_list(self, mock_suggest_tags, mock_fetch_tags):
        """Test handling of large existing tags list"""
        large_tags_list = [f"tag-{i}" for i in range(1000)]
        mock_fetch_tags.return_value = large_tags_list
        mock_suggest_tags.return_value = ["tag-1", "tag-2"]
        
        response = client.post("/suggest-tags", json=sample_event.dict())
        
        assert response.status_code == 200
        # Verify the large list was passed to suggest_tags
        mock_suggest_tags.assert_called_once()
        call_args = mock_suggest_tags.call_args[0]
        assert len(call_args[1]) == 1000  # existing_tags parameter