import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-community/async-storage';
import apiKey from '../../config/api-key';
import api from '../../services/api';
import {
  ComicContent,
  ComicImage,
  ComicPagesText,
  ComicTitleText,
  Container,
} from './styles';

interface Comic {
  id: number;
  title: string;
  pageCount: number;
  thumbnail: {
    path: string;
    extension: string;
  };
}

interface Character {
  id: number;
  name: string;
  description: string;
  thumbnail: {
    path: string;
    extension: string;
  };
  comics: {
    available: number;
  };
}

type RootStackParamList = {
  Home: undefined;
  Profile: {
    character: Character;
    screen: React.FC;
  };
  Feed: { sort: 'latest' | 'top' } | undefined;
};

type ProfileScreenRouteProp = RouteProp<RootStackParamList, 'Profile'>;

type ProfileScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Profile'
>;

type Props = {
  route: ProfileScreenRouteProp;
  navigation: ProfileScreenNavigationProp;
};

const CharacterComics: React.FC<Props> = ({ route }: Props) => {
  const [totalItems, setTotalItems] = useState(null);
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNextComics = useCallback(() => {
    if (totalItems === comics.length) {
      return;
    }

    const { character } = route.params;

    setLoading(true);

    api
      .get(`/v1/public/characters/${character.id}/comics`, {
        params: {
          ...apiKey,
          limit: 10,
          offset: comics.length,
        },
      })
      .then((response) => {
        setComics([...comics, ...response.data.data.results]);
        setTotalItems(response.data.data.total);
      })
      .catch(() => {
        Alert.alert('Error on load Comics');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [comics]);

  const renderItem = useCallback(
    ({ item }) => {
      return (
        <ComicContent>
          <ComicImage
            style={{ resizeMode: 'stretch' }}
            source={{
              uri: `${item.thumbnail.path}.${item.thumbnail.extension}`,
            }}
          />
          <ComicTitleText>{item.title}</ComicTitleText>
          <ComicPagesText>{`${item.pageCount} pages`}</ComicPagesText>
        </ComicContent>
      );
    },
    [comics],
  );

  const renderLoadingFooter = useCallback(() => {
    if (!loading) {
      return null;
    }

    return <ActivityIndicator />;
  }, [loading]);

  useEffect(() => {
    const { id } = route.params.character;

    AsyncStorage.getItem(`@MarvelApp:characters:comics:${id}`).then(
      (comicsJson) => {
        if (comicsJson === null) {
          loadNextComics();
          return;
        }

        setComics(JSON.parse(comicsJson));
      },
    );
  }, []);

  useEffect(() => {
    const { id } = route.params.character;

    const storageCharacters = AsyncStorage.setItem(
      `@MarvelApp:characters:comics:${id}`,
      JSON.stringify(comics),
    );

    Promise.resolve(storageCharacters);
  }, [comics]);

  return (
    <Container>
      <FlatList<Comic>
        style={{ maxHeight: Dimensions.get('window').height * 0.82 }}
        horizontal={!!1}
        data={comics}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.id.toString()}
        ListFooterComponent={renderLoadingFooter}
        onEndReached={loadNextComics}
        onEndReachedThreshold={0.5}
      />
    </Container>
  );
};

export default CharacterComics;
